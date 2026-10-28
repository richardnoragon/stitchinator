use axum::{
    Json,
    body::Bytes,
    http::{HeaderMap, StatusCode},
};
use serde_json::{Value, json};
use std::{
    fs,
    path::Path,
    process::{Command, Stdio},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
type Error = (StatusCode, String);
fn run(program: &str, args: &[&str], output: &Path, deadline: Instant) -> Result<(), String> {
    let mut child = Command::new(program)
        .args(args)
        .stdout(fs::File::create(output).map_err(|e| e.to_string())?)
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| {
            format!(
                "{program} is unavailable. Install Poppler and Tesseract for PDF/photo conversion."
            )
        })?;
    loop {
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            return if status.success() {
                Ok(())
            } else {
                Err(format!(
                    "{program} could not read this document. Try a clearer image, an unlocked PDF, or paste its text."
                ))
            };
        }
        if Instant::now() > deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err(
                "Document conversion timed out; split the document into smaller files.".into(),
            );
        }
        std::thread::sleep(Duration::from_millis(50));
    }
}
struct Temporary(std::path::PathBuf);
impl Drop for Temporary {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
fn extract(bytes: Bytes, pdf: bool, language: &str) -> Result<Value, String> {
    let root = std::env::temp_dir().join(format!(
        "stitchinator-ocr-{}-{}",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_nanos()
    ));
    fs::create_dir(&root).map_err(|e| e.to_string())?;
    let _cleanup = Temporary(root.clone());
    let input = root.join(if pdf { "input.pdf" } else { "input.img" });
    fs::write(&input, &bytes).map_err(|e| e.to_string())?;
    let input = input.to_str().ok_or("Invalid temporary path")?;
    let text = root.join("extracted.txt");
    let log = root.join("log");
    let deadline = Instant::now() + Duration::from_secs(60);
    let mut used_ocr = !pdf;
    let mut result;
    if pdf {
        let info = root.join("info.txt");
        run("pdfinfo", &[input], &info, deadline)?;
        let info = fs::read_to_string(info).map_err(|e| e.to_string())?;
        let pages = info
            .lines()
            .find_map(|s| {
                s.strip_prefix("Pages:")
                    .and_then(|n| n.trim().parse::<u32>().ok())
            })
            .ok_or("Unable to determine PDF page count")?;
        if pages > 10 {
            return Err(
                "Import up to 10 PDF pages at a time; split a longer pattern first.".into(),
            );
        }
        run(
            "pdftotext",
            &["-layout", input, text.to_str().unwrap()],
            &log,
            deadline,
        )?;
        let extracted = fs::read_to_string(&text).map_err(|e| e.to_string())?;
        let page_text = extracted.split('\u{000c}').collect::<Vec<_>>();
        let has_rounds = |text: &str| {
            text.lines().any(|s| {
                let s = s.trim().to_lowercase();
                let rest = s.trim_start_matches(|c: char| {
                    c.is_alphabetic() || c.is_whitespace() || c == '.'
                });
                rest.starts_with(|c: char| c.is_ascii_digit())
                    && ["sc", "dc", "inc", "dec", "fm", "stb", "ch"]
                        .iter()
                        .any(|key| s.contains(key))
            })
        };
        result = String::new();
        for page in 1..=pages {
            let original = page_text.get((page - 1) as usize).copied().unwrap_or("");
            if has_rounds(original) {
                result.push_str(original);
                result.push('\n');
                continue;
            }
            let number = page.to_string();
            let prefix = root.join(format!("page-{page}"));
            run(
                "pdftoppm",
                &[
                    "-f",
                    &number,
                    "-l",
                    &number,
                    "-singlefile",
                    "-scale-to",
                    "1800",
                    "-png",
                    input,
                    prefix.to_str().unwrap(),
                ],
                &log,
                deadline,
            )?;
            let image = prefix.with_extension("png");
            let out = root.join(format!("ocr-{page}.txt"));
            run(
                "tesseract",
                &[
                    image.to_str().unwrap(),
                    "stdout",
                    "-l",
                    language,
                    "--psm",
                    "6",
                ],
                &out,
                deadline,
            )?;
            let recognized = fs::read_to_string(out).map_err(|e| e.to_string())?;
            if has_rounds(&recognized) || original.trim().is_empty() {
                result.push_str(&recognized);
                used_ocr = true;
            } else {
                result.push_str(original);
            }
            result.push('\n');
        }
    } else {
        run(
            "tesseract",
            &[input, "stdout", "-l", language, "--psm", "6"],
            &text,
            deadline,
        )?;
        result = fs::read_to_string(&text).map_err(|e| e.to_string())?;
    }
    if result.trim().is_empty() {
        return Err("No text was recognized. Try a clearer reference or type the rounds.".into());
    }
    if result.chars().count() > 200000 {
        return Err("Extracted text exceeds 200000 characters; split the document.".into());
    }
    Ok(json!({"text":result,"ocr":used_ocr,"review_required":true}))
}
pub async fn extract_document(headers: HeaderMap, bytes: Bytes) -> Result<Json<Value>, Error> {
    if headers.get("x-stitchinator").and_then(|h| h.to_str().ok()) != Some("1") {
        return Err((StatusCode::FORBIDDEN, "Missing application header".into()));
    }
    if bytes.is_empty() || bytes.len() > 10 * 1024 * 1024 {
        return Err((StatusCode::BAD_REQUEST, "Use a document up to 10 MB".into()));
    }
    let pdf = bytes.starts_with(b"%PDF-");
    if !pdf && !bytes.starts_with(b"\x89PNG\r\n\x1a\n") && !bytes.starts_with(b"\xff\xd8\xff") {
        return Err((StatusCode::BAD_REQUEST, "Choose a PDF, PNG or JPEG".into()));
    }
    let language = match headers.get("x-ocr-language").and_then(|h| h.to_str().ok()) {
        Some("deu") => "deu",
        Some("eng+deu") => "eng+deu",
        _ => "eng",
    }
    .to_string();
    tokio::task::spawn_blocking(move || extract(bytes, pdf, &language))
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Document conversion failed".into(),
            )
        })?
        .map(Json)
        .map_err(|e| (StatusCode::UNPROCESSABLE_ENTITY, e))
}

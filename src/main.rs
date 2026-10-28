mod amigurumi;
mod backup;
mod consumption;
mod inventory;
mod library;
mod patterns;
mod reservations;
mod yarn_plan;
use axum::{
    Json, Router,
    extract::DefaultBodyLimit,
    http::StatusCode,
    response::{Html, IntoResponse},
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, sync::Arc};
use tokio::sync::Mutex;

#[derive(Clone)]
struct App {
    path: PathBuf,
    backups: backup::Store,
    lock: Arc<Mutex<()>>,
}
#[derive(Deserialize)]
struct Estimate {
    width: f64,
    length: f64,
    swatch_width: f64,
    swatch_length: f64,
    stitches: f64,
    rows: f64,
    grams: f64,
    skein_grams: f64,
    skein_meters: f64,
    allowance: f64,
}
#[derive(Serialize, Debug)]
struct ResultEstimate {
    stitches: f64,
    rows: f64,
    grams: f64,
    meters: f64,
    skeins: f64,
}
fn calculate(e: &Estimate) -> Result<ResultEstimate, &'static str> {
    let positive = [
        e.width,
        e.length,
        e.swatch_width,
        e.swatch_length,
        e.stitches,
        e.rows,
        e.grams,
        e.skein_grams,
        e.skein_meters,
    ];
    if positive
        .iter()
        .any(|n| !n.is_finite() || *n <= 0.0 || *n > 1_000_000.0)
        || !e.allowance.is_finite()
        || !(0.0..=100.0).contains(&e.allowance)
    {
        return Err("Enter positive measurements and an allowance from 0 to 100%.");
    }
    let grams = e.width * e.length / (e.swatch_width * e.swatch_length)
        * e.grams
        * (1.0 + e.allowance / 100.0);
    Ok(ResultEstimate {
        stitches: e.width / e.swatch_width * e.stitches,
        rows: e.length / e.swatch_length * e.rows,
        grams,
        meters: grams / e.skein_grams * e.skein_meters,
        skeins: grams / e.skein_grams,
    })
}
async fn estimate(
    Json(e): Json<Estimate>,
) -> Result<Json<ResultEstimate>, (StatusCode, &'static str)> {
    calculate(&e)
        .map(Json)
        .map_err(|e| (StatusCode::UNPROCESSABLE_ENTITY, e))
}
async fn local_only(
    req: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let host = req
        .headers()
        .get("host")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let hostname = host.split(':').next().unwrap_or("");
    if !matches!(hostname, "127.0.0.1" | "localhost") {
        return (StatusCode::FORBIDDEN, "Use localhost or 127.0.0.1").into_response();
    }
    if let Some(origin) = req.headers().get("origin") {
        let expected = format!("http://{host}");
        if origin.to_str().ok() != Some(expected.as_str()) {
            return (StatusCode::FORBIDDEN, "Cross-origin request denied").into_response();
        }
    }
    let mut response = next.run(req).await;
    response
        .headers_mut()
        .insert("x-content-type-options", "nosniff".parse().unwrap());
    response.headers_mut().insert("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'".parse().unwrap());
    response
}

#[tokio::main]
async fn main() {
    let dir = PathBuf::from(std::env::var("STITCHINATOR_DATA").unwrap_or_else(|_| "data".into()));
    tokio::fs::create_dir_all(&dir)
        .await
        .expect("Create data directory");
    backup::recover(&dir).expect("Recover interrupted restore");
    library::migrate(&dir)
        .await
        .expect("Migrate project library without changing original project.json");
    let state = App {
        path: dir.join("project.json"),
        lock: Arc::new(Mutex::new(())),
        backups: backup::Store::new(std::env::var_os("STITCHINATOR_BACKUPS").map(PathBuf::from)),
    };
    tokio::spawn(backup::scheduler(state.clone()));
    let app = Router::new().route("/api/amigurumi/extract",post(amigurumi::extract_document).layer(DefaultBodyLimit::max(10*1024*1024))).route("/amigurumi-model.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/amigurumi-model.mjs")) })).route("/amigurumi.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/amigurumi.mjs")) })).route("/api/patterns",get(patterns::get).post(patterns::append)).route("/picture-library.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/picture-library.mjs")) })).route("/stitch-placement.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/stitch-placement.mjs")) })).route("/pattern-library.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/pattern-library.mjs")) })).route("/shaping.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/shaping.mjs")) })).route("/knitting.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/knitting.mjs")) })).route("/yarn-catalog.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/yarn-catalog.mjs")) })).route("/terminology.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/terminology.mjs")) })).route("/photos.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/photos.mjs")) })).route("/assembly-plan.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/assembly-plan.mjs")) })).route("/assembly.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/assembly.mjs")) })).route("/rounds.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/rounds.mjs")) })).route("/shapes.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/shapes.mjs")) })).route("/api/estimate-piece",post(yarn_plan::estimate)).route("/yarn-bands.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/yarn-bands.mjs")) })).route("/api/projects/{id}/consumption",get(consumption::get).post(consumption::put)).route("/consumption.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/consumption.mjs")) })).route("/api/projects/{id}/reservations",get(reservations::preview).post(reservations::apply)).route("/yarn-planning.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/yarn-planning.mjs")) })).route("/api/inventory",get(inventory::get).put(inventory::put)).route("/inventory.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/inventory.mjs")) })).route("/progress.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/progress.mjs")) })).route("/estimates.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/estimates.mjs")) })).route("/pieces.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/pieces.mjs")) })).route("/project-model.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/project-model.mjs")) })).route("/backups.mjs",get(||async{ ([(axum::http::header::CONTENT_TYPE,"text/javascript")],include_str!("../web/backups.mjs")) }))
        .route("/api/backups",get(backup::status).post(backup::run))
        .route("/api/backups/{id}/restore",post(backup::restore_route))
        .route(
            "/library.mjs",
            get(|| async {
                (
                    [(axum::http::header::CONTENT_TYPE, "text/javascript")],
                    include_str!("../web/library.mjs"),
                )
            }),
        )
        .route(
            "/revisions.mjs",
            get(|| async {
                (
                    [(axum::http::header::CONTENT_TYPE, "text/javascript")],
                    include_str!("../web/revisions.mjs"),
                )
            }),
        )
        .route(
            "/exports.mjs",
            get(|| async {
                (
                    [(axum::http::header::CONTENT_TYPE, "text/javascript")],
                    include_str!("../web/exports.mjs"),
                )
            }),
        )
        .route(
            "/instructions.mjs",
            get(|| async {
                (
                    [(axum::http::header::CONTENT_TYPE, "text/javascript")],
                    include_str!("../web/instructions.mjs"),
                )
            }),
        )
        .route(
            "/symbols.js",
            get(|| async {
                (
                    [(axum::http::header::CONTENT_TYPE, "text/javascript")],
                    include_str!("../web/symbols.js"),
                )
            }),
        )
        .route(
            "/",
            get(|| async { Html(include_str!("../web/index.html")) }),
        )
        .route(
            "/app.js",
            get(|| async {
                (
                    [(axum::http::header::CONTENT_TYPE, "text/javascript")],
                    include_str!("../web/app.js"),
                )
            }),
        )
        .route(
            "/style.css",
            get(|| async {
                (
                    [(axum::http::header::CONTENT_TYPE, "text/css")],
                    include_str!("../web/style.css"),
                )
            }),
        )
        .route("/health", get(|| async { "ok" }))
        .route("/api/estimate", post(estimate))
        .route("/api/project", axum::routing::put(||async{(StatusCode::CONFLICT,"Storage upgraded. Download unsaved work from this tab, then refresh to use the project library.")}))
        .route("/api/projects", get(library::list))
        .route("/api/projects/{id}", get(library::get).put(library::put))
        .layer(DefaultBodyLimit::max(2 * 1024 * 1024))
        .layer(axum::middleware::from_fn(local_only))
        .with_state(state);
    let addr = std::env::var("STITCHINATOR_BIND").unwrap_or_else(|_| "127.0.0.1:8080".into());
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Bind server");
    println!("Stitchinator listening on {addr}");
    axum::serve(listener, app).await.expect("Serve application");
}
#[cfg(test)]
mod tests {
    use super::*;
    fn sample() -> Estimate {
        Estimate {
            width: 20.,
            length: 100.,
            swatch_width: 10.,
            swatch_length: 10.,
            stitches: 20.,
            rows: 24.,
            grams: 5.,
            skein_grams: 50.,
            skein_meters: 120.,
            allowance: 10.,
        }
    }
    #[test]
    fn scales_area_and_applies_allowance_once() {
        let r = calculate(&sample()).unwrap();
        assert!((r.grams - 110.).abs() < 1e-9);
        assert!((r.meters - 264.).abs() < 1e-9);
        assert_eq!(r.stitches, 40.);
        assert_eq!(r.rows, 240.);
        assert!((r.skeins - 2.2).abs() < 1e-9);
    }
    #[test]
    fn rejects_missing_gauge() {
        let mut e = sample();
        e.swatch_width = 0.;
        assert!(calculate(&e).is_err());
    }
    #[test]
    fn rejects_invalid_allowance() {
        let mut e = sample();
        e.allowance = -1.;
        assert!(calculate(&e).is_err());
    }
}

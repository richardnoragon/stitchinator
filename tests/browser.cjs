const { chromium, firefox } = require("playwright");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stitchinator-test-"));
const backupDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "stitchinator-backups-"),
);
fs.writeFileSync(
  path.join(backupDir, ".stitchinator-backups"),
  "stitchinator-backups-v1\n",
);
const base = "http://127.0.0.1:18089";
const server = spawn("./target/debug/stitchinator", [], {
  env: {
    ...process.env,
    STITCHINATOR_BIND: "127.0.0.1:18089",
    STITCHINATOR_DATA: dir,
    STITCHINATOR_BACKUPS: backupDir,
  },
  stdio: "ignore",
});
(async () => {
  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(base + "/health")).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    for (const engine of [chromium, firefox]) {
      fs.rmSync(path.join(dir, "projects"), { recursive: true, force: true });
      fs.mkdirSync(path.join(dir, "projects"));
      const browser = await engine.launch({ headless: true });
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (e) => { errors.push(e.message); console.error("Browser error:", e.message); });

      await page.goto(base);
      await page.waitForFunction(
        () =>
          !document.querySelector("#status").textContent.includes("Loading"),
      );
      if(process.argv.includes('--amigurumi-only')) {
        await page.locator('#amiStarter').click();assert.match(await page.locator('#amiPreviewReport').textContent(),/7 rounds/);
        await page.locator('#amiReviewed').check();await page.locator('#amiApply').click();await page.waitForFunction(()=>!document.querySelector('#amiPartEditor').hidden);
        assert.equal(await page.locator('#amiRoundsTable tr').count(),7);
        await page.locator('#amiRoundGauge').fill('20');await page.locator('#amiStitchGauge').fill('20');await page.locator('#amiRoundNotes').fill('Stuff after round five.');
        await page.locator('#amiRoundColor').fill('#4a8eab');await page.locator('#amiPreviewRound').click();await page.locator('#amiReviewed').check();await page.locator('#amiApply').click();
        await page.locator('#amiViewDetail').selectOption('stitches');await page.locator('#amiCanvas').screenshot({path:'/tmp/stitchinator-amigurumi-stitches-'+engine.name()+'.png'});
        const getData=()=>page.evaluate(async()=>await(await fetch('/api/projects/'+localStorage.getItem('stitchinator-active-project'))).json());
        await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved locally'));
        let data=await getData(),part=data.pieces.find(p=>p.id===data.activePieceId);assert.equal(part.amigurumi.rounds[0].color,'#4a8eab');assert.equal(part.amigurumi.rounds[0].notes,'Stuff after round five.');
        for(const [button,ext]of [['amiExportOBJ','obj'],['amiExportSTL','stl'],['amiExportPDF','pdf'],['amiExportJSON','json'],['amiExportText','txt'],['amiExportPNG','png'],['amiExportChart','chart.png']]){
          const waiting=page.waitForEvent('download');await page.locator('#'+button).click();const file=await waiting,pathName='/tmp/stitchinator-amigurumi-'+engine.name()+'.'+ext;await file.saveAs(pathName);const bytes=fs.readFileSync(pathName);assert.ok(bytes.length>100);
          if(ext==='stl')assert.equal(bytes.length,84+bytes.readUInt32LE(80)*50);
          if(ext==='pdf')assert.equal(bytes.subarray(0,4).toString(),'%PDF');
          if(ext==='json')assert.equal(JSON.parse(bytes).parts[0].design.rounds.length,7);
        }
        await page.locator('#openWorking').click();assert.match(await page.locator('#workingTitle').textContent(),/round 1 of 7 in amigurumi/);await page.locator('#workingNext').click();assert.match(await page.locator('#workingTitle').textContent(),/round 2/);await page.locator('#closeWorking').click();
        await page.locator('#amiImportFile').setInputFiles('/tmp/stitchinator-amigurumi-'+engine.name()+'.json');await page.waitForFunction(()=>!document.querySelector('#amiApply').disabled);await page.locator('#amiReviewed').check();await page.locator('#amiApply').click();
        await page.locator('#amiSourceText').fill('Part: Body (make 1)\nR1: 6 sc in MR (6)\nR2: 6 inc (12)\nR3-5: 12 sc (12)\nPart: Ears (make 2)\nR1: 6 sc in MR (6)');await page.locator('#amiPreviewImport').click();assert.match(await page.locator('#amiPreviewReport').textContent(),/Ears × 2/);await page.locator('#amiReviewed').check();await page.locator('#amiApply').click();
        await page.locator('#amiViewScope').selectOption('all');await page.locator('#amiViewDetail').selectOption('surface');await page.locator('#amiCanvas').screenshot({path:'/tmp/stitchinator-amigurumi-assembly-'+engine.name()+'.png'});
        const pdfText='Part: Head\nR1: 6 sc in MR (6)\nR2: 6 inc (12)\nR3: 12 sc (12)';
        function makePdf(imageData){
          const image=imageData?Buffer.from(imageData,'base64'):null,content=image?Buffer.from('q 600 0 0 400 0 0 cm /Im0 Do Q'):Buffer.from('BT /F1 20 Tf 40 700 Td '+pdfText.split('\n').map((s,i)=>(i?'0 -32 Td ':'')+'('+s.replace(/([\\()])/g,'\\$1')+') Tj').join('\n')+' ET');
          const objs=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << '+(image?'/XObject << /Im0 4 0 R >>':'/Font << /F1 4 0 R >>')+' >> /Contents 5 0 R >>'),image?Buffer.concat([Buffer.from('<< /Type /XObject /Subtype /Image /Width 1400 /Height 700 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+image.length+' >>\nstream\n'),image,Buffer.from('\nendstream')]):Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),Buffer.concat([Buffer.from('<< /Length '+content.length+' >>\nstream\n'),content,Buffer.from('\nendstream')])];
          let chunks=[Buffer.from('%PDF-1.4\n')],offset=chunks[0].length,offsets=[];objs.forEach((o,i)=>{offsets.push(offset);const chunk=Buffer.concat([Buffer.from((i+1)+' 0 obj\n'),o,Buffer.from('\nendobj\n')]);chunks.push(chunk);offset+=chunk.length;});chunks.push(Buffer.from('xref\n0 6\n0000000000 65535 f \n'+offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+offset+'\n%%EOF'));return Buffer.concat(chunks);
        }
        const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1400;c.height=700;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='black';ctx.font='48px monospace';['Part: Head','R1: 6 sc in MR (6)','R2: 6 inc (12)','R3: 12 sc (12)'].forEach((s,i)=>ctx.fillText(s,50,90+i*100));return c.toDataURL('image/jpeg',.95).split(',')[1];});
        const textPdf=makePdf(),scanPdf=makePdf(image);
        for(const [bytes,type,ocr]of [[textPdf,'application/pdf',false],[Buffer.from(image,'base64'),'image/jpeg',true],[scanPdf,'application/pdf',true]]){
          const response=await page.request.post(base+'/api/amigurumi/extract',{headers:{'X-Stitchinator':'1','Content-Type':type},data:bytes,timeout:90000});assert.equal(response.ok(),true,await response.text());const recognized=await response.json();assert.equal(recognized.ocr,ocr);assert.match(recognized.text,/6\s+sc/i);
        }
        const textPath='/tmp/stitchinator-ami-text-'+engine.name()+'.pdf',scanPath='/tmp/stitchinator-ami-scan-'+engine.name()+'.pdf',mixedPath='/tmp/stitchinator-ami-mixed-'+engine.name()+'.pdf';fs.writeFileSync(textPath,textPdf);fs.writeFileSync(scanPath,scanPdf);require('node:child_process').execFileSync('pdfunite',[textPath,scanPath,mixedPath]);
        const mixed=await page.request.post(base+'/api/amigurumi/extract',{headers:{'X-Stitchinator':'1','Content-Type':'application/pdf'},data:fs.readFileSync(mixedPath),timeout:90000});assert.equal(mixed.ok(),true,await mixed.text());const mixedText=await mixed.json();assert.equal(mixedText.ocr,true);assert.ok((mixedText.text.match(/6\s+sc/gi)??[]).length>=2,'Both selectable and scanned PDF pages must be retained');
        await page.locator('#amiImportFile').setInputFiles({name:'head.pdf',mimeType:'application/pdf',buffer:textPdf});await page.waitForFunction(()=>!document.querySelector('#amiImportFields').disabled&&!document.querySelector('#amiApply').disabled);assert.match(await page.locator('#amiSourceText').inputValue(),/R1/);await page.locator('#amiReviewed').check();await page.locator('#amiApply').click();assert.ok(await page.locator('#amiReferences iframe').count()>0);
        await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved locally'));await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#amiRoundsTable tr').length===3);
        data=await getData();part=data.pieces.find(p=>p.id===data.activePieceId);assert.equal(part.amigurumi.references[0].type,'application/pdf');assert.equal(part.amigurumi.rounds.length,3);assert.ok(data.pieces.some(p=>p.quantity===2&&p.amigurumi));
        assert.ok(await page.evaluate(async()=>{const {amiChart}=await import('/amigurumi.mjs');const c=document.createElement('canvas');amiChart(c,{mode:'spiral',rounds:[{recipe:'1000 sc'}]});return c.width>4000&&c.height===c.width;}),'Dense round charts need a high-resolution canvas');
        await page.locator('#estimate').click();assert.match(await page.locator('#estimateResult').textContent(),/not calibrated/);
        assert.deepEqual(errors,[]);await browser.close();console.log(engine.name()+': amigurumi round editing, views, seven exports, JSON/text/PDF/photo/scanned-PDF import and persistence passed');continue;
      }
      if(process.argv.includes('--pictures-only')) {
        // An older queued response must not announce that newer edits are saved.
        let releaseFirst,releaseSecond,seenFirst,seenSecond,queued=0;
        const firstGate=new Promise(r=>releaseFirst=r),secondGate=new Promise(r=>releaseSecond=r),firstSeen=new Promise(r=>seenFirst=r),secondSeen=new Promise(r=>seenSecond=r);
        const queuedUrl=base+'/api/projects/*';
        await page.route(queuedUrl,async route=>{if(route.request().method()!=='PUT'){await route.continue();return;}queued++;if(queued===1){seenFirst();await firstGate;}else if(queued===2){seenSecond();await secondGate;}await route.continue();});
        await page.locator('#name').fill('First queued save');await page.locator('#name').dispatchEvent('change');await page.locator('#save').click();await firstSeen;
        await page.locator('#name').fill('Newest queued save');await page.locator('#name').dispatchEvent('change');await page.locator('#save').click();releaseFirst();await secondSeen;
        assert.match(await page.locator('#status').textContent(),/Saving newer changes/);releaseSecond();
        await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved locally'));await page.unroute(queuedUrl);
        await page.waitForFunction(()=>document.querySelectorAll('.picturePatternCard').length===3);
        const original=await(await page.request.get(base+'/api/patterns')).json();
        const currentId=await page.evaluate(()=>localStorage.getItem('stitchinator-active-project'));
        const projectBefore=await(await page.request.get(base+'/api/projects/'+currentId)).json();
        const starter=page.locator('[data-pattern-id="starter-sc"]');
        assert.equal(await starter.locator('svg').count(),1);assert.match(await starter.textContent(),/Single crochet.*24/s);
        await starter.getByRole('button',{name:'View / edit a new copy'}).click();
        await page.locator('#pictureNewName').fill('Single crochet rows');await page.locator('#savePictureDraft').click();
        assert.match(await page.locator('#pictureDraftStatus').textContent(),/unique new name/);
        await page.locator('#pictureNewName').fill('My SC study');
        await page.locator('#pictureDescription').fill('My fabric sample description');
        await page.locator('#pictureInstructions').fill('My edited crochet recipe. Chain 7 and review the changed chart.');
        await page.locator('#pictureProjectStitch').selectOption('ch');await page.locator('#addPictureProjectStitch').click();
        await page.locator('[data-picture-cell="0"]').focus();await page.keyboard.press('Enter');
        const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=60;const x=c.getContext('2d');x.fillStyle='#c27859';x.fillRect(0,0,80,60);return c.toDataURL('image/png').split(',')[1];});
        await page.locator('#picturePhotoInput').setInputFiles({name:'Synthetic swatch.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
        await page.waitForSelector('#pictureDraftPhoto img');await page.locator('#savePictureDraft').click();
        await page.waitForFunction(()=>!document.querySelector('#picturePatternDialog').open);
        const saved=await(await page.request.get(base+'/api/patterns')).json();assert.equal(saved.entries.length,1);const entry=saved.entries[0];
        assert.equal(entry.name,'My SC study');assert.equal(entry.description,'My fabric sample description');assert.match(entry.photo,/^data:image\/jpeg;base64,/);
        assert.notEqual(entry.cells[0],'sc');assert.deepEqual(saved.starters,original.starters);
        const projectAfter=await(await page.request.get(base+'/api/projects/'+currentId)).json();assert.deepEqual(projectAfter.pieces,projectBefore.pieces);
        const card=page.locator(`[data-pattern-id="${entry.id}"]`);assert.equal(await card.locator('img').count(),1);
        await card.getByRole('button',{name:'Add to project patterns'}).click();assert.match(await page.locator('#pictureLibraryStatus').textContent(),/copied into this project/);
        await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved locally'));
        const imported=await(await page.request.get(base+'/api/projects/'+currentId)).json();assert.equal(imported.patterns[0].instructions,entry.instructions);assert.equal(imported.patterns[0].photo,entry.photo);
        const duplicate=await page.request.post(base+'/api/patterns',{headers:{'X-Stitchinator':'1','X-Pattern-Version':String(saved._version)},data:{...entry,id:'new-copy-id',name:' MY SC STUDY '}});assert.equal(duplicate.status(),400);
        const stale=await page.request.post(base+'/api/patterns',{headers:{'X-Stitchinator':'1','X-Pattern-Version':'0'},data:{...entry,id:'stale-id',name:'Stale study'}});assert.equal(stale.status(),409);
        await card.getByRole('button',{name:'View / edit a new copy'}).click();await page.locator('#pictureNewName').fill('My revised study');
        const parallel=await page.request.post(base+'/api/patterns',{headers:{'X-Stitchinator':'1','X-Pattern-Version':String(saved._version)},data:{...entry,id:'other-tab-copy',name:'Other tab study'}});assert.equal(parallel.ok(),true);
        await page.locator('#savePictureDraft').click();await page.waitForFunction(()=>document.querySelector('#pictureDraftStatus').textContent.includes('Library changed'));
        assert.equal(await page.locator('#pictureNewName').inputValue(),'My revised study');
        await page.locator('#refreshPictureDraftLibrary').click();await page.waitForFunction(()=>document.querySelector('#pictureDraftStatus').textContent.includes('list reloaded'));
        await page.locator('#savePictureDraft').click();await page.waitForFunction(()=>!document.querySelector('#picturePatternDialog').open);
        await page.locator('#newProjectName').fill('Another crochet project');await page.locator('#newProject').click();
        await page.waitForFunction(()=>document.querySelector('#name').value==='Another crochet project');
        assert.equal(await page.locator(`[data-pattern-id="${entry.id}"]`).count(),1);
        await page.reload();await page.waitForSelector(`[data-pattern-id="${entry.id}"]`);
        await page.locator('#pictureLibrarySearch').fill('My SC study');assert.equal(await page.locator('.picturePatternCard').count(),1);
        await page.locator('#pictureLibraryPanel').screenshot({path:'/tmp/stitchinator-picture-library-'+engine.name()+'.png'});
        assert.deepEqual(errors,[]);await browser.close();console.log(engine.name()+': picture library, edited copies, photo, project reuse, cross-project reload and stale-save protection passed');continue;
      }
      if(process.argv.includes('--snapping-only')) {
        await page.locator('#symbolAnchor').evaluate(el=>el.closest('details').open=true);
        await page.locator('#chartTool').selectOption('position');await page.locator('#snapOrientation').selectOption('along');
        await page.locator('#symbolAnchor').selectOption('top');
        await page.locator('#chart button').first().scrollIntoViewIfNeeded();
        const g=await page.locator('#chart').boundingBox(),b=await page.locator('#chart button').first().boundingBox();
        await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(g.x+g.width*2.5/12,g.y+g.height*.85/10,{steps:8});await page.mouse.up();
        await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved locally'));
        const data=await page.evaluate(async()=>await(await fetch('/api/projects/'+localStorage.getItem('stitchinator-active-project'))).json());
        assert.equal(data.pieces[0].cellPlacements[108].target,'vertex');
        await page.locator('#createRoundChart').click();
        await page.locator('#roundDiagram').scrollIntoViewIfNeeded();
        const svgBounds=await page.locator('#roundDiagram').boundingBox(),hit=await page.locator('[data-round-slot="0-0"] circle').boundingBox();
        const radius=20+125*.65,targetX=320+radius/Math.sqrt(2),targetY=targetX;
        await page.mouse.move(hit.x+hit.width/2,hit.y+hit.height/2);await page.mouse.down();
        await page.mouse.move(svgBounds.x+svgBounds.width*targetX/640,svgBounds.y+svgBounds.height*targetY/640,{steps:10});await page.mouse.up();
        const transform=await page.locator('[data-round-slot="0-0"] text, [data-round-slot="0-0"] image').getAttribute('transform');
        assert.ok(Math.abs(Number(transform.match(/rotate\(([-.0-9]+)/)[1])+135)<1,transform);
        await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved locally'));
        await page.reload();await page.waitForSelector('[data-round-slot="0-0"]');
        assert.equal(await page.locator('[data-round-slot="0-0"] text, [data-round-slot="0-0"] image').getAttribute('transform'),transform);
        assert.deepEqual(errors,[]);console.log(engine.name()+': drag-to-vertex, radial tangent orientation and reload passed');await browser.close();continue;
      }

      await page.locator("#estimate").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#estimateResult")
          .textContent.includes("unavailable"),
      );
      assert.match(
        await page.locator("#estimateResult").textContent(),
        /unavailable/,
      );
      const fixture = {
        width: "20",
        length: "100",
        swatch_width: "10",
        swatch_length: "10",
        stitches: "20",
        rows: "24",
        grams: "5",
        skein_grams: "50",
        skein_meters: "120",
        allowance: "10",
      };
      for (const [id, value] of Object.entries(fixture))
        await page.locator("#" + id).fill(value);
      await page.locator("#estimate").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#estimateResult")
          .textContent.includes("110.0 g"),
      );
      await page
        .locator("summary")
        .filter({ hasText: "Create a custom stitch" })
        .click();
      await page.locator("#stitchName").fill("Synthetic shell");
      await page.locator("#abbreviation").fill("sh");
      await page.locator("#symbol").fill("◇");
      await page.locator("#addStitch").click();
      await page.locator("#chart button").first().click();
      assert.equal(
        await page.locator("#chart button").first().textContent(),
        "◇",
      );
      await page.locator("#undo").click();
      assert.equal(
        await page.locator("#chart button").first().textContent(),
        "×",
      );
      await page.locator("#redo").click();
      assert.equal(
        await page.locator("#chart button").first().textContent(),
        "◇",
      );
      await page.locator("#patternName").fill("Synthetic repeat");
      await page.locator("#savePattern").click();
      assert.ok((await page.locator("#patterns button").count()) > 0);
      await page.locator("#cols").fill("8");
      await page.locator("#resize").click();
      assert.equal(await page.locator("#chart button").count(), 80);
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      const libraryEntries = await (
        await page.request.get(base + "/api/projects")
      ).json();
      let saved = await (
        await page.request.get(base + "/api/projects/" + libraryEntries[0].id)
      ).json();
      assert.equal(
        saved.pieces.find((p) => p.id === saved.activePieceId).cols,
        12,
        "preview must not save proposed dimensions",
      );
      await page.locator("#apply").click();
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      await page.reload();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("restored"),
      );
      assert.equal(await page.locator("#chart button").count(), 80);
      await page.locator("#cols").fill("12");
      await page.locator("#resize").click();
      await page.locator("#apply").click();
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      await page
        .locator("summary")
        .filter({ hasText: "Create a custom stitch" })
        .click();
      await page.locator("#symbolMode").selectOption("import");
      await page.locator("#symbolFile").setInputFiles({
        name: "test.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path d="M10 10 L54 54 M54 10 L10 54" stroke="black" stroke-width="5"/></svg>',
        ),
      });
      await page.waitForFunction(() =>
        document.querySelector("#symbolStatus").textContent.includes("ready"),
      );
      await page.locator("#stitchName").fill("Imported cross");
      await page.locator("#abbreviation").fill("ic");
      await page.locator("#produced").fill("2");
      await page.locator("#addStitch").click();
      await page.locator("#chart button").first().click();
      assert.equal(
        await page.locator("#chart button").first().locator("img").count(),
        1,
      );
      await page.locator("#chart button").nth(12).click();
      assert.match(
        await page.locator("#validation").textContent(),
        /Check stitch counts/,
      );
      await page.locator("#chartTool").selectOption("select");
      await page.locator("#chart button").first().click();
      await page.locator("#chart button").nth(13).click();
      assert.match(
        await page.locator("#selectionStatus").textContent(),
        /2 columns × 2 rows/,
      );
      await page.locator("#patternName").fill("Selected motif");
      await page.locator("#savePattern").click();
      assert.ok(
        await page
          .getByRole("button", { name: "Repeat “Selected motif” (2 × 2)" })
          .count(),
      );
      await page.locator("#symbolFile").setInputFiles({
        name: "unsafe.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        ),
      });
      await page.waitForFunction(() =>
        document
          .querySelector("#symbolStatus")
          .textContent.includes("shapes only"),
      );
      await page.locator("#symbolMode").selectOption("draw");
      const box = await page.locator("#symbolCanvas").boundingBox();
      await page.mouse.move(box.x + 20, box.y + 20);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.up();
      await page.locator("#stitchName").fill("Drawn stitch");
      await page.locator("#abbreviation").fill("ds");
      await page.locator("#addStitch").click();
      assert.equal(
        await page.locator("#palette button").last().locator("img").count(),
        1,
      );
      const png = await page
        .locator("#symbolCanvas")
        .evaluate((c) => c.toDataURL("image/png").split(",")[1]);
      await page.locator("#symbolMode").selectOption("import");
      await page.locator("#symbolFile").setInputFiles({
        name: "drawing.png",
        mimeType: "image/png",
        buffer: Buffer.from(png, "base64"),
      });
      await page.waitForFunction(() =>
        document.querySelector("#symbolStatus").textContent.includes("ready"),
      );
      await page.locator("#stitchName").fill("PNG stitch");
      await page.locator("#abbreviation").fill("png");
      await page.locator("#addStitch").click();
      await page.locator("#symbolMode").selectOption("existing");
      await page.locator("#stitchName").fill("Copied symbol");
      await page.locator("#abbreviation").fill("copy");
      await page.locator("#addStitch").click();
      assert.equal(
        await page.locator("#palette button").last().locator("img").count(),
        1,
      );
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      await page.reload();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("restored"),
      );
      assert.equal(
        await page.locator("#chart button").first().locator("img").count(),
        1,
      );
      await page.locator("#generateInstructions").click();
      assert.match(
        await page.locator("#instructionReview").textContent(),
        /match/,
      );
      await page.locator('textarea[data-row="0"]').fill("My custom row notes");
      await page.locator("#finishingNotes").fill("Weave in ends carefully.");
      await page.locator("#chartTool").selectOption("paint");
      await page.locator("#palette button").filter({ hasText: "ch" }).click();
      await page.locator("#chart button").last().click();
      assert.equal(
        await page.locator('textarea[data-row="0"]').inputValue(),
        "My custom row notes",
      );
      assert.match(
        await page.locator("#instructionReview").textContent(),
        /need review/,
      );
      await page
        .getByRole("button", { name: "Keep my text — reviewed" })
        .first()
        .click();
      assert.match(
        await page.locator("#instructionReview").textContent(),
        /match/,
      );
      await page.locator("#chart button").nth(118).click();
      await page
        .getByRole("button", { name: "Use regenerated text" })
        .first()
        .click();
      assert.match(
        await page.locator('textarea[data-row="0"]').inputValue(),
        /Chain/,
      );
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      await page.reload();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("restored"),
      );
      assert.equal(
        await page.locator("#finishingNotes").inputValue(),
        "Weave in ends carefully.",
      );
      assert.match(
        await page.locator('textarea[data-row="0"]').inputValue(),
        /Chain/,
      );
      assert.match(
        await page.locator("#chartGauge").textContent(),
        /sample chart represents/,
      );
      await page.locator("#chartRows").fill("12");
      await page.locator("#resize").click();
      await page.locator("#apply").click();
      await page
        .getByRole("button", { name: "Use regenerated text" })
        .last()
        .click();
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      await page.reload();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("restored"),
      );
      assert.ok(await page.locator('textarea[data-row="11"]').count());
      assert.match(
        await page.locator("#instructionReview").textContent(),
        /need review/,
      );
      await page.locator("#chartRows").fill("10");
      await page.locator("#resize").click();
      await page.locator("#apply").click();
      assert.match(
        await page.locator("#instructions").textContent(),
        /outside current chart/,
      );
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      await page.locator("#export-chart").uncheck();
      await page.locator("#export-instructions").uncheck();
      await page.locator("#export-notes").uncheck();
      await page.locator("#previewExport").click();
      await page.waitForFunction(
        () => !document.querySelector("#exportPages").hidden,
      );
      assert.match(
        await page.locator("#exportWarnings").textContent(),
        /consumes/,
      );
      assert.ok(await page.locator("#exportPng").isDisabled());
      await page.locator("#exportAcknowledge").check();
      const downloadPromise = page.waitForEvent("download");
      await page.locator("#exportPng").click();
      const download = await downloadPromise;
      const file = await download.path();
      const pngBytes = fs.readFileSync(file);
      assert.equal(pngBytes.subarray(1, 4).toString(), "PNG");
      assert.equal(pngBytes.readUInt32BE(16), 1200);
      await page.evaluate(() => {
        window.print = () => {
          window.didPrint = true;
        };
      });
      await page.locator("#exportPdf").click();
      await page.waitForFunction(() => window.didPrint);
      assert.ok((await page.locator("#printExport img").count()) > 0);
      if (engine.name() === "chromium") {
        const pdf = await page.pdf({
          path: "/tmp/stitchinator-export.pdf",
          preferCSSPageSize: true,
          printBackground: true,
        });
        assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
        assert.ok(pdf.length > 10000);
      }
      await page.locator("#exportPage").screenshot({
        path: "/tmp/stitchinator-export-" + engine.name() + ".png",
      });
      await page.locator("#closeExport").click();
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      await page.reload();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("restored"),
      );
      assert.equal(await page.locator("#export-chart").isChecked(), false);
      assert.equal(await page.locator("#export-picture").isChecked(), true);
      await page.locator("#export-picture").uncheck();
      await page.locator("#export-yarn").uncheck();
      await page.locator("#previewExport").click();
      assert.match(
        await page.locator("#exportStatus").textContent(),
        /at least one/,
      );
      for (const key of ["chart", "picture", "yarn", "instructions", "notes"])
        await page.locator("#export-" + key).check();
      await page
        .locator("#finishingNotes")
        .fill("Synthetic pagination check. ".repeat(250));
      await page.locator("#previewExport").click();
      await page.waitForFunction(
        () => !document.querySelector("#exportPages").hidden,
      );
      const pageInfo = await page.locator("#exportPageNumber").textContent();
      assert.ok(Number(pageInfo.split(" of ")[1]) > 1);
      await page.locator("#exportNext").click();
      assert.match(
        await page.locator("#exportPageNumber").textContent(),
        /Page 2/,
      );
      await page.locator("#closeExport").click();
      await page.locator("#width").fill("21");
      await page.locator("#width").press("Tab");
      await page.locator("#previewExport").click();
      assert.match(
        await page.locator("#exportStatus").textContent(),
        /Apply or cancel/,
      );
      await page.locator("#cancelDimensions").click();
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      await page.locator("#revisionName").fill("Original shell border");
      await page.locator("#saveRevision").click();
      assert.match(
        await page.locator("#revisionCount").textContent(),
        /1 saved/,
      );
      await page.locator("#name").fill("Changed scarf");
      await page.locator("#name").press("Tab");
      await page.locator("#revisionName").fill("Wider handle idea");
      await page.locator("#saveRevision").click();
      await page.locator("#revisionSearch").fill("SHELL");
      assert.equal(await page.locator("#revisionList button").count(), 1);
      page.once("dialog", (d) => d.accept());
      await page.locator("#revisionList button").click();
      assert.equal(await page.locator("#name").inputValue(), "My scarf");
      assert.match(
        await page.locator("#revisionCount").textContent(),
        /4 saved/,
      );
      assert.ok(await page.locator("#undo").isDisabled());
      await page.locator("#revisionSearch").fill("");
      assert.equal(await page.locator("#revisionList button").count(), 4);
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      await page.reload();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("restored"),
      );
      assert.match(
        await page.locator("#revisionCount").textContent(),
        /4 saved/,
      );
      const portablePromise = page.waitForEvent("download");
      await page.locator("#download").click();
      const portable = await portablePromise;
      const portableFile = await portable.path();
      const bundle = JSON.parse(fs.readFileSync(portableFile, "utf8"));
      assert.equal(bundle.revisions.length, 4);
      assert.equal(bundle.revisions[0].snapshot.revisions, undefined);
      await page.locator("#revisionName").fill("original shell border");
      await page.locator("#saveRevision").click();
      assert.match(
        await page.locator("#revisionStatus").textContent(),
        /already exists/,
      );
      const malformed = structuredClone(bundle);
      malformed.revisions[0].snapshot.revisions = [];
      await page.locator("#import").setInputFiles({
        name: "bad-history.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(malformed)),
      });
      await page.waitForFunction(() =>
        document
          .querySelector("#status")
          .textContent.includes("Invalid revision history"),
      );
      assert.match(
        await page.locator("#revisionCount").textContent(),
        /4 saved/,
      );
      await page.locator("#import").setInputFiles(portableFile);
      await page.locator("#openExisting").click();
      await page.waitForFunction(() =>
        /Local project restored|Saved locally/.test(document.querySelector("#status").textContent),
      );
      assert.match(
        await page.locator("#revisionCount").textContent(),
        /4 saved/,
      );
      await page.waitForFunction(
        () =>
          document.querySelector("#libraryStatus").textContent ===
          "Project ready.",
      );
      const originalId = bundle.id;
      await page.locator("#newProjectName").fill("Summer bag");
      await page.locator("#newProject").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#name").value === "Summer bag" &&
          !document.querySelector("main").inert,
      );
      assert.match(
        await page.locator("#revisionCount").textContent(),
        /0 saved/,
      );
      await page
        .locator("summary")
        .filter({ hasText: "Project details" })
        .click();
      await page.locator("#projectDescription").fill("A light summer tote");
      await page.locator("#projectTags").fill("gift, summer");
      await page.locator("#projectFolder").fill("Gifts/Bags");
      await page.locator("#saveMetadata").click();
      await page.waitForFunction(() => !document.querySelector("main").inert);
      await page.locator("#projectSearch").fill("SUMMER");
      assert.equal(await page.locator("#projectList .projectItem").count(), 1);
      await page.locator("#projectSearch").fill("");
      await page.locator("#projectFilter").selectOption("Gifts");
      assert.equal(await page.locator("#projectList .projectItem").count(), 1);
      await page.locator("#projectFilter").selectOption("");
      await page.locator("#export-picture").uncheck();
      await page
        .locator("#projectList .projectItem")
        .filter({ hasText: "My scarf" })
        .getByRole("button", { name: "Open project" })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector("#name").value === "My scarf" &&
          !document.querySelector("main").inert,
      );
      assert.match(
        await page.locator("#revisionCount").textContent(),
        /4 saved/,
      );
      assert.ok(await page.locator("#export-picture").isChecked());
      await page
        .locator("#projectList .projectItem")
        .filter({ hasText: "Summer bag" })
        .getByRole("button", { name: "Open project" })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector("#name").value === "Summer bag" &&
          !document.querySelector("main").inert,
      );
      assert.equal(
        await page.locator("#projectFolder").inputValue(),
        "Gifts/Bags",
      );
      assert.equal(await page.locator("#export-picture").isChecked(), false);
      await page.locator("#import").setInputFiles(portableFile);
      await page.locator("#importCopy").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#name").value === "My scarf (copy)" &&
          !document.querySelector("main").inert,
      );
      assert.match(
        await page.locator("#projectCount").textContent(),
        /3 projects/,
      );
      assert.match(
        await page.locator("#revisionCount").textContent(),
        /4 saved/,
      );
      await page.reload();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("restored"),
      );
      assert.equal(await page.locator("#name").inputValue(), "My scarf (copy)");
      const original = await (
        await page.request.get(base + "/api/projects/" + originalId)
      ).json();
      assert.equal(original.fields.name, "My scarf");
      const headers = {
        "Content-Type": "application/json",
        "X-Stitchinator": "1",
        "X-Project-Version": String(original._version),
      };
      const ok = await page.request.put(base + "/api/projects/" + originalId, {
        headers,
        data: original,
      });
      assert.equal(ok.status(), 200);
      const stale = await page.request.put(
        base + "/api/projects/" + originalId,
        { headers, data: original },
      );
      assert.equal(stale.status(), 409);
      const mismatch = await page.request.put(
        base + "/api/projects/not-the-same-id",
        { headers, data: original },
      );
      assert.equal(mismatch.status(), 400);
      await page.route("**/api/projects/*", async (route) => {
        if (route.request().method() === "PUT")
          await route.fulfill({ status: 500, body: "Synthetic save failure" });
        else await route.continue();
      });
      await page
        .locator("#projectList .projectItem")
        .filter({ hasText: "Summer bag" })
        .getByRole("button", { name: "Open project" })
        .click();
      await page.waitForFunction(() =>
        document
          .querySelector("#libraryStatus")
          .textContent.includes("Switching was cancelled"),
      );
      assert.equal(await page.locator("#name").inputValue(), "My scarf (copy)");
      await page.unroute("**/api/projects/*");
      const oldEndpoint = await page.request.put(base + "/api/project", {
        data: { schema: 1 },
      });
      assert.equal(oldEndpoint.status(), 409);
      await page.locator("#backupNow").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#backupActionStatus").textContent ===
            "Backup completed." && !document.querySelector("main").inert,
      );
      const backupState = await (
        await page.request.get(base + "/api/backups")
      ).json();
      assert.ok(backupState.points.length > 0);
      const restoreId = backupState.points[0].id;
      await page.locator("#name").fill("Changed after backup");
      await page.locator("#name").press("Tab");
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      const beforeRestoreList = await (
        await page.request.get(base + "/api/projects")
      ).json();
      const currentId = beforeRestoreList.find(
        (p) => p.name === "Changed after backup",
      ).id;
      const beforeRestore = await (
        await page.request.get(base + "/api/projects/" + currentId)
      ).json();
      await page.locator("#restorePoint").selectOption(restoreId);
      page.once("dialog", (d) => d.accept());
      await page.locator("#restoreBackup").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#name").value === "My scarf (copy)" &&
          document.querySelector("#status").textContent.includes("restored"),
      );
      const afterRestore = await (
        await page.request.get(base + "/api/backups")
      ).json();
      assert.ok(afterRestore.points.some((p) => p.kind === "safety"));
      const staleAfterRestore = await page.request.put(
        base + "/api/projects/" + currentId,
        {
          headers: {
            "X-Stitchinator": "1",
            "X-Project-Version": String(beforeRestore._version),
          },
          data: beforeRestore,
        },
      );
      assert.equal(staleAfterRestore.status(), 409);
      fs.unlinkSync(path.join(backupDir, ".stitchinator-backups"));
      await page.locator("#refreshBackups").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#backupStatus")
          .textContent.includes("unavailable"),
      );
      await page.locator("#name").fill("Work continues without backup drive");
      await page.locator("#name").press("Tab");
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      fs.writeFileSync(
        path.join(backupDir, ".stitchinator-backups"),
        "stitchinator-backups-v1\n",
      );
      await page.locator("#backupNow").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#backupActionStatus").textContent ===
            "Backup completed." && !document.querySelector("main").inert,
      );
      // Each design retains its chart, measurements, instructions, and quantity.
      const mainPieceId = await page.locator("#pieceSelect").inputValue();
      const mainNotes = await page.locator("#finishingNotes").inputValue();
      await page.locator("#newPieceName").fill("Handle");
      await page.locator("#addPiece").click();
      assert.equal(await page.locator("#pieceSelect option").count(), 2);
      assert.equal(await page.locator("#grams").inputValue(), "");
      const handleId = await page.locator("#pieceSelect").inputValue();
      await page.locator("#pieceQuantity").fill("2");
      await page.locator("#pieceSelect").selectOption(mainPieceId);
      assert.equal(await page.locator("#pieceSelect").inputValue(), handleId);
      assert.equal(await page.locator("#pieceQuantity").inputValue(), "2");
      await page.locator("#savePiece").click();
      await page.locator("#estimateProject").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#projectEstimate")
          .textContent.includes("Project total unavailable"),
      );
      for (const [id, value] of Object.entries({
        ...fixture,
        width: "10",
        length: "40",
      })) {
        await page.locator("#" + id).fill(value);
        await page.locator("#" + id).press("Tab");
      }
      await page.locator("#applyDimensions").click();
      await page.locator("#estimate").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#estimateResult")
          .textContent.includes("44.0 g"),
      );
      await page.locator("#estimateProject").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#projectEstimate")
          .textContent.includes("Total mass: 154.0 g"),
      );
      await page.locator("#pieceSelect").selectOption(mainPieceId);
      assert.equal(await page.locator("#width").inputValue(), "20");
      assert.equal(await page.locator("#pieceQuantity").inputValue(), "1");
      await page.locator("#pieceSelect").selectOption(handleId);
      assert.equal(await page.locator("#width").inputValue(), "10");
      assert.equal(await page.locator("#pieceQuantity").inputValue(), "2");
      await page.locator("#generateInstructions").click();
      await page.locator("#finishingNotes").fill("Attach both handles.");
      await page.locator("#finishingNotes").press("Tab");
      await page.locator("#pieceSelect").selectOption(mainPieceId);
      assert.equal(
        await page.locator("#finishingNotes").inputValue(),
        mainNotes,
      );
      await page.locator("#pieceSelect").selectOption(handleId);
      assert.equal(
        await page.locator("#finishingNotes").inputValue(),
        "Attach both handles.",
      );
      await page.locator("#revisionName").fill("Two-piece assembly");
      await page.locator("#saveRevision").click();
      await page.locator("#newPieceName").fill("Lining");
      await page.locator("#addPiece").click();
      assert.equal(await page.locator("#pieceSelect option").count(), 3);
      await page.locator("#revisionSearch").fill("Two-piece assembly");
      page.once("dialog", (d) => d.accept());
      await page.locator("#revisionList button").click();
      assert.equal(await page.locator("#pieceSelect option").count(), 2);
      assert.equal(await page.locator("#pieceQuantity").inputValue(), "2");
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      await page.reload();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("restored"),
      );
      assert.equal(await page.locator("#pieceSelect option").count(), 2);
      assert.equal(await page.locator("#pieceQuantity").inputValue(), "2");
      await page.locator("#completedRows").fill("12");
      await page.locator("#stoppingNote").fill("At handle edge");
      await page.locator("#saveProgress").click();
      await page.locator("#progressCopy").selectOption("2");
      assert.equal(await page.locator("#completedRows").inputValue(), "0");
      await page.locator("#completedRows").fill("3");
      await page.locator("#saveProgress").click();
      await page.locator("#progressCopy").selectOption("1");
      assert.equal(await page.locator("#completedRows").inputValue(), "12");
      assert.equal(
        await page.locator("#stoppingNote").inputValue(),
        "At handle edge",
      );
      await page.locator("#palette button").filter({ hasText: "ch" }).click();
      await page.locator("#chart button").first().click();
      await page.waitForFunction(() =>
        document
          .querySelector("#progressWarning")
          .textContent.includes("Design changed"),
      );
      await page.locator("#retainProgress").click();
      assert.equal(await page.locator("#progressWarning").textContent(), "");
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      await page.reload();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("restored"),
      );
      assert.equal(await page.locator("#completedRows").inputValue(), "12");
      const current = await (
        await page.request.get(base + "/api/projects/" + currentId)
      ).json();
      assert.equal(current.schema, 2);
      assert.equal(current.pieces.length, 2);
      const oldTab = { ...current, schema: 1 };
      const downgrade = await page.request.put(
        base + "/api/projects/" + currentId,
        {
          headers: {
            "X-Stitchinator": "1",
            "X-Project-Version": String(current._version),
          },
          data: oldTab,
        },
      );
      assert.equal(downgrade.status(), 409);
      await page.locator("#backupNow").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#backupActionStatus").textContent ===
            "Backup completed." && !document.querySelector("main").inert,
      );
      const pieceBackups = await (
        await page.request.get(base + "/api/backups")
      ).json();
      const piecesPoint = pieceBackups.points[0].id;
      await page.locator("#newPieceName").fill("Temporary lining");
      await page.locator("#addPiece").click();
      await page.locator("#restorePoint").selectOption(piecesPoint);
      page.once("dialog", (d) => d.accept());
      await page.locator("#restoreBackup").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#status").textContent.includes("restored") &&
          document.querySelectorAll("#pieceSelect option").length === 2,
      );
      assert.equal(await page.locator("#pieceQuantity").inputValue(), "2");
      assert.equal(await page.locator("#completedRows").inputValue(), "12");
      await page.locator("#progressCopy").selectOption("2");
      assert.equal(await page.locator("#completedRows").inputValue(), "3");
      page.once("dialog", (d) => d.dismiss());
      await page.locator("#resetProgress").click();
      assert.equal(await page.locator("#completedRows").inputValue(), "3");
      page.once("dialog", (d) => d.accept());
      await page.locator("#resetProgress").click();
      assert.equal(await page.locator("#completedRows").inputValue(), "0");
      await page.locator("#progressCopy").selectOption("1");
      assert.equal(await page.locator("#completedRows").inputValue(), "12");
      await page.locator("#inventoryPanel > summary").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#inventoryStatus").textContent ===
          "Inventory loaded.",
      );
      for (const [key, value] of Object.entries({
        name: "Blue cotton lot",
        brand: "Synthetic brand",
        product: "Cotton",
        fiber: "100% cotton",
        color: "Blue",
        dye_lot: "A123",
        category: "DK",
        skein_grams: "50",
        skein_meters: "120",
        remaining_grams: "75",
        size_mm: "2",
      })) {
        await page.locator("#yarn_" + key).fill(value);
      }
      await page.locator("#saveYarn").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#inventoryStatus").textContent ===
          "Yarn lot saved locally.",
      );
      assert.match(
        await page.locator("#inventoryList").textContent(),
        /180.0 m/,
      );
      const inventoryBefore = await (
        await page.request.get(base + "/api/inventory")
      ).json();
      assert.equal(inventoryBefore.items.length, 1);
      const invalidInventory = structuredClone(inventoryBefore);
      invalidInventory.items[0].remaining_grams = -1;
      const invalidSave = await page.request.put(base + "/api/inventory", {
        headers: {
          "X-Stitchinator": "1",
          "X-Inventory-Version": String(inventoryBefore._version),
        },
        data: invalidInventory,
      });
      assert.equal(invalidSave.status(), 400);
      await page.locator("#inventoryList button").click();
      await page.locator("#yarn_shape").selectOption("flat");
      await page.locator("#yarn_size_mm").fill("4");
      await page.locator("#yarn_thickness_mm").fill("0.5");
      await page.locator("#yarn_remaining_grams").fill("25");
      await page.locator("#saveYarn").click();
      await page.waitForFunction(() =>
        document.querySelector("#inventoryList").textContent.includes("60.0 m"),
      );
      const staleInventory = await page.request.put(base + "/api/inventory", {
        headers: {
          "X-Stitchinator": "1",
          "X-Inventory-Version": String(inventoryBefore._version),
        },
        data: inventoryBefore,
      });
      assert.equal(staleInventory.status(), 409);
      await page.locator("#inventorySearch").fill("A123");
      assert.equal(await page.locator("#inventoryList button").count(), 1);
      await page.locator("#inventorySearch").fill("unknown lot");
      assert.equal(await page.locator("#inventoryList button").count(), 0);
      await page.locator("#inventorySearch").fill("");
      await page.locator("#backupNow").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#backupActionStatus").textContent ===
            "Backup completed." && !document.querySelector("main").inert,
      );
      const inventoryPoint = (
        await (await page.request.get(base + "/api/backups")).json()
      ).points[0].id;
      await page.locator("#inventoryList button").click();
      await page.locator("#yarn_remaining_grams").fill("0");
      await page.locator("#saveYarn").click();
      await page.waitForFunction(() =>
        document.querySelector("#inventoryList").textContent.includes("0 g /"),
      );
      const changedInventory = await (
        await page.request.get(base + "/api/inventory")
      ).json();
      await page.locator("#restorePoint").selectOption(inventoryPoint);
      page.once("dialog", (d) => d.accept());
      await page.locator("#restoreBackup").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#status").textContent.includes("restored") &&
          document.querySelector("#inventoryStatus").textContent ===
            "Inventory loaded.",
      );
      const restoredInventory = await (
        await page.request.get(base + "/api/inventory")
      ).json();
      assert.equal(restoredInventory.items[0].remaining_grams, 25);
      assert.equal(restoredInventory.items[0].thickness_mm, 0.5);
      assert.ok(restoredInventory._version > changedInventory._version);
      assert.equal(
        (await (await page.request.get(base + "/api/projects")).json()).length,
        3,
      );
      await page.locator("#refreshYarns").click();
      await page.waitForFunction(
        () => document.querySelectorAll("#pieceYarn option").length === 2,
      );
      const yarnId = restoredInventory.items[0].id;
      const pieceIds = await page
        .locator("#pieceSelect option")
        .evaluateAll((options) => options.map((o) => o.value));
      for (const pieceId of pieceIds) {
        await page.locator("#pieceSelect").selectOption(pieceId);
        await page.locator("#pieceYarn").selectOption(yarnId);
        page.once("dialog", (d) => d.accept());
        await page.locator("#assignYarn").click();
        assert.equal(await page.locator("#grams").inputValue(), "");
        for (const [key, value] of Object.entries({
          swatch_width: "10",
          swatch_length: "10",
          stitches: "20",
          rows: "24",
          grams: "5",
        })) {
          await page.locator("#" + key).fill(value);
          await page.locator("#" + key).press("Tab");
        }
      }
      await page.locator("#projectLifecycle").selectOption("Ready to make");
      page.once("dialog", (d) => d.accept());
      await page.locator("#applyLifecycle").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#reservationState")
          .textContent.includes("Status: Ready to make"),
      );
      assert.match(
        await page.locator("#reservationReport").textContent(),
        /shortage to purchase 129.0 g/,
      );
      const reserved = await (
        await page.request.get(base + "/api/projects/" + currentId)
      ).json();
      assert.ok(Math.abs(reserved.reservation.grams[yarnId] - 154) < 0.00001);
      assert.equal(
        (await (await page.request.get(base + "/api/inventory")).json())
          .items[0].remaining_grams,
        25,
      );
      const reservationPreview = await (
        await page.request.get(
          base + "/api/projects/" + currentId + "/reservations",
        )
      ).json();
      await page.locator("#width").fill("12");
      await page.locator("#width").press("Tab");
      await page.locator("#applyDimensions").click();
      assert.match(
        await page.locator("#reservationState").textContent(),
        /Reservation needs review/,
      );
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      const stalePlan = await page.request.post(
        base + "/api/projects/" + currentId + "/reservations",
        {
          headers: { "X-Stitchinator": "1" },
          data: { token: reservationPreview.token, status: "Ready to make" },
        },
      );
      assert.equal(stalePlan.status(), 409);
      await page.locator("#projectLifecycle").selectOption("On hold");
      page.once("dialog", (d) => d.accept());
      await page.locator("#applyLifecycle").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#reservationState")
          .textContent.includes("Status: On hold"),
      );
      assert.match(
        await page.locator("#reservationState").textContent(),
        /Reservation needs review/,
      );
      assert.ok(
        Math.abs(
          (
            await (
              await page.request.get(base + "/api/projects/" + currentId)
            ).json()
          ).reservation.grams[yarnId] - 154,
        ) < 0.00001,
      );
      await page.locator("#reconcileReservations").check();
      page.once("dialog", (d) => d.accept());
      await page.locator("#applyLifecycle").click();
      await page.waitForFunction(
        () =>
          !document
            .querySelector("#reservationState")
            .textContent.includes("Reservation needs review") &&
          !document.querySelector("main").inert,
      );
      const reconciled = await (
        await page.request.get(base + "/api/projects/" + currentId)
      ).json();
      assert.ok(reconciled.reservation.grams[yarnId] > 154);
      // A project import/save cannot smuggle stock commitments or reset its status.
      const spoofed = {
        ...reconciled,
        lifecycle: "Completed",
        reservation: { grams: {} },
      };
      const spoofSave = await page.request.put(
        base + "/api/projects/" + currentId,
        {
          headers: {
            "X-Stitchinator": "1",
            "X-Project-Version": String(reconciled._version),
          },
          data: spoofed,
        },
      );
      assert.equal(spoofSave.status(), 200);
      assert.equal(
        (
          await (
            await page.request.get(base + "/api/projects/" + currentId)
          ).json()
        ).lifecycle,
        "On hold",
      );
      await page.reload();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("restored"),
      );
      await page.locator("#backupNow").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#backupActionStatus").textContent ===
            "Backup completed." && !document.querySelector("main").inert,
      );
      const reservationPoint = (
        await (await page.request.get(base + "/api/backups")).json()
      ).points[0].id;
      await page.locator("#projectLifecycle").selectOption("Completed");
      page.once("dialog", (d) => d.accept());
      await page.locator("#applyLifecycle").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#reservationState")
          .textContent.includes("Status: Completed"),
      );
      assert.deepEqual(
        (
          await (
            await page.request.get(base + "/api/projects/" + currentId)
          ).json()
        ).reservation.grams,
        {},
      );
      await page.locator("#restorePoint").selectOption(reservationPoint);
      page.once("dialog", (d) => d.accept());
      await page.locator("#restoreBackup").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#reservationState")
          .textContent.includes("Status: On hold"),
      );
      const recoveredReservation = await (
        await page.request.get(base + "/api/projects/" + currentId)
      ).json();
      assert.deepEqual(
        recoveredReservation.reservation,
        reconciled.reservation,
      );
      assert.equal(
        (await (await page.request.get(base + "/api/inventory")).json())
          .items[0].remaining_grams,
        25,
      );
      await page.locator("#refreshUsage").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#usageStatus")
          .textContent.includes("Usage refreshed"),
      );
      const usageBefore = await (
        await page.request.get(
          base + "/api/projects/" + currentId + "/consumption",
        )
      ).json();
      await page.locator("#usageLot").selectOption(yarnId);
      await page.locator("#usageGrams").fill("10");
      await page.locator("#usageNote").fill("First rows");
      page.once("dialog", (d) => d.accept());
      await page.locator("#saveUsage").click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("#usageStatus")
            .textContent.includes("saved together") &&
          !document.querySelector("main").inert,
      );
      const usageAfter = await (
        await page.request.get(
          base + "/api/projects/" + currentId + "/consumption",
        )
      ).json();
      assert.equal(usageAfter.lots[0].remaining_grams, 15);
      assert.equal(usageAfter.totals[yarnId], 10);
      const heldAfterUse = await (
        await page.request.get(
          base + "/api/projects/" + currentId + "/reservations",
        )
      ).json();
      assert.ok(
        Math.abs(
          heldAfterUse.rows[0].committed -
            (reconciled.reservation.grams[yarnId] - 10),
        ) < 0.00001,
      );
      const staleUsage = await page.request.post(
        base + "/api/projects/" + currentId + "/consumption",
        {
          headers: { "X-Stitchinator": "1" },
          data: {
            inventory_version: usageBefore.inventory_version,
            project_version: usageBefore.project_version,
            lot_id: yarnId,
            grams: 10,
            note: "Duplicate retry",
          },
        },
      );
      assert.equal(staleUsage.status(), 409);
      await page.locator("#usageList button").click();
      await page.locator("#usageGrams").fill("6");
      await page.locator("#usageNote").fill("Corrected weighing");
      page.once("dialog", (d) => d.accept());
      await page.locator("#saveUsage").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#usageList").textContent.includes("6 g") &&
          !document.querySelector("main").inert,
      );
      const correctedUsage = await (
        await page.request.get(
          base + "/api/projects/" + currentId + "/consumption",
        )
      ).json();
      assert.equal(correctedUsage.lots[0].remaining_grams, 19);
      assert.equal(correctedUsage.entries[0].history.length, 2);
      const overuse = await page.request.post(
        base + "/api/projects/" + currentId + "/consumption",
        {
          headers: { "X-Stitchinator": "1" },
          data: {
            inventory_version: correctedUsage.inventory_version,
            project_version: correctedUsage.project_version,
            lot_id: yarnId,
            grams: 100,
            note: "Too much",
          },
        },
      );
      assert.equal(overuse.status(), 400);
      await page.locator("#backupNow").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#backupActionStatus").textContent ===
            "Backup completed." && !document.querySelector("main").inert,
      );
      const usagePoint = (
        await (await page.request.get(base + "/api/backups")).json()
      ).points[0].id;
      await page.locator("#projectLifecycle").selectOption("Completed");
      page.once("dialog", (d) => d.accept());
      await page.locator("#applyLifecycle").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#reservationState")
          .textContent.includes("Status: Completed"),
      );
      await page.locator("#refreshUsage").click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("#usageStatus")
            .textContent.includes("Usage refreshed") &&
          !document.querySelector("main").inert,
      );
      await page.locator("#usageList button").click();
      await page.locator("#usageGrams").fill("0");
      await page.locator("#usageNote").fill("Removed mistaken usage");
      page.once("dialog", (d) => d.accept());
      await page.locator("#saveUsage").click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("#usageList")
            .textContent.includes("(removed)") &&
          !document.querySelector("main").inert,
      );
      assert.equal(
        (await (await page.request.get(base + "/api/inventory")).json())
          .items[0].remaining_grams,
        25,
      );
      assert.equal(
        (
          await (
            await page.request.get(
              base + "/api/projects/" + currentId + "/reservations",
            )
          ).json()
        ).rows[0].committed,
        0,
      );
      await page.locator("#restorePoint").selectOption(usagePoint);
      page.once("dialog", (d) => d.accept());
      await page.locator("#restoreBackup").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#reservationState")
          .textContent.includes("Status: On hold"),
      );
      const recoveredUsage = await (
        await page.request.get(
          base + "/api/projects/" + currentId + "/consumption",
        )
      ).json();
      assert.equal(recoveredUsage.entries[0].grams, 6);
      assert.equal(recoveredUsage.entries[0].history.length, 2);
      assert.equal(recoveredUsage.lots[0].remaining_grams, 19);
      const accountingInventory = await (
        await page.request.get(base + "/api/inventory")
      ).json();
      const erasedLedger = { ...accountingInventory, consumption: [] };
      const preserveLedger = await page.request.put(base + "/api/inventory", {
        headers: {
          "X-Stitchinator": "1",
          "X-Inventory-Version": String(accountingInventory._version),
        },
        data: erasedLedger,
      });
      assert.equal(preserveLedger.status(), 200);
      assert.deepEqual(
        (await preserveLedger.json()).consumption,
        accountingInventory.consumption,
      );
      // Two measured fabrics, with the first band's requirement split across dye lots.
      const bandStock = await (
        await page.request.get(base + "/api/inventory")
      ).json();
      const secondLot = {
        ...bandStock.items[0],
        id: "band-second-lot",
        name: "Second blue lot",
        dye_lot: "B456",
      };
      const thirdLot = {
        ...bandStock.items[0],
        id: "band-third-lot",
        name: "Green cotton",
        color: "Green",
        dye_lot: "C789",
      };
      const stockSaved = await page.request.put(base + "/api/inventory", {
        headers: {
          "X-Stitchinator": "1",
          "X-Inventory-Version": String(bandStock._version),
        },
        data: {
          ...bandStock,
          items: [...bandStock.items, secondLot, thirdLot],
        },
      });
      assert.equal(stockSaved.status(), 200);
      await page.locator("#refreshBandLots").click();
      await page.waitForFunction(
        () => document.querySelectorAll("#bandLot option").length === 4,
      );
      const originalBandPieceId = await page
        .locator("#pieceSelect")
        .inputValue();
      const savedBeforeBands = await (
        await page.request.get(base + "/api/projects/" + currentId)
      ).json();
      const basePiece = savedBeforeBands.pieces.find(
        (p) => p.id === originalBandPieceId,
      );
      async function bandFields(name, weight, color) {
        for (const [key, value] of Object.entries({
          name,
          pattern: "Synthetic sc",
          percent: "50",
          color,
          swatch_width: "10",
          swatch_length: "10",
          stitches: "20",
          rows: "24",
          grams: weight,
          hook: "4",
        }))
          await page.locator("#band_" + key).fill(value);
      }
      await bandFields("Blue border", "5", "#123456");
      await page.locator("#bandLot").selectOption(yarnId);
      await page.locator("#bandLotPercent").fill("60");
      await page.locator("#addBandLot").click();
      await page.locator("#bandLot").selectOption(secondLot.id);
      await page.locator("#bandLotPercent").fill("40");
      await page.locator("#addBandLot").click();
      await page.locator("#saveBand").click();
      assert.match(await page.locator("#bandCoverage").textContent(), /50%/);
      await page.locator("#estimate").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#estimateResult")
          .textContent.includes("unavailable"),
      );
      await bandFields("Green body", "10", "#008844");
      await page.locator("#bandLot").selectOption(thirdLot.id);
      await page.locator("#bandLotPercent").fill("100");
      await page.locator("#addBandLot").click();
      await page.locator("#saveBand").click();
      await page.locator("#estimate").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#estimateResult")
          .textContent.includes("Green cotton"),
      );
      assert.match(
        await page.locator("#reservationState").textContent(),
        /Reservation needs review/,
      );
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      const bandProject = await (
        await page.request.get(base + "/api/projects/" + currentId)
      ).json();
      const bp = bandProject.pieces.find((p) => p.id === originalBandPieceId);
      const bandEstimate = await (
        await page.request.post(base + "/api/estimate-piece", {
          data: { piece: bp, allowance: 10 },
        })
      ).json();
      const baseGrams =
        ((Number(basePiece.fields.width) * Number(basePiece.fields.length)) /
          100) *
        5 *
        1.1 *
        basePiece.quantity;
      assert.ok(Math.abs(bandEstimate.grams - baseGrams * 1.5) < 0.00001);
      assert.ok(
        Math.abs(
          bandEstimate.lots.find((l) => l.id === yarnId).grams -
            baseGrams * 0.5 * 0.6,
        ) < 0.00001,
      );
      await page.locator("#reviewReservations").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#reservationReport")
          .textContent.includes("Second blue lot"),
      );
      assert.match(
        await page.locator("#reservationReport").textContent(),
        /mixes dye lots/,
      );
      await page.reload();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("restored"),
      );
      assert.equal(
        await page
          .locator("#bandList button")
          .filter({ hasText: "Edit band" })
          .count(),
        2,
      );
      await page.locator("#previewExport").click();
      await page.waitForFunction(
        () => !document.querySelector("#exportPages").hidden,
      );
      await page.locator("#exportDialog").evaluate((dialog) => dialog.close());
      const bandColors = await page.locator("#fabric").evaluate((canvas) => {
        const pixels = canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data;
        let blue = 0,
          green = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] === 18 && pixels[i + 1] === 52 && pixels[i + 2] === 86)
            blue++;
          if (pixels[i] === 0 && pixels[i + 1] === 136 && pixels[i + 2] === 68)
            green++;
        }
        return { blue, green };
      });
      assert.ok(bandColors.blue > 0 && bandColors.green > 0);
      await page
        .locator("#bandList > p")
        .nth(1)
        .getByRole("button", { name: "Move up", exact: true })
        .click();
      assert.match(
        await page.locator("#bandList > p").first().textContent(),
        /Green body/,
      );
      await page.locator("#undo").click();
      assert.match(
        await page.locator("#bandList > p").first().textContent(),
        /Blue border/,
      );
      await page.locator("#backupNow").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#backupActionStatus").textContent ===
            "Backup completed." && !document.querySelector("main").inert,
      );
      const bandPoint = (
        await (await page.request.get(base + "/api/backups")).json()
      ).points[0].id;
      page.once("dialog", (d) => d.accept());
      await page.locator("#singleYarnMode").click();
      assert.match(
        await page.locator("#bandCoverage").textContent(),
        /Single-yarn mode/,
      );
      await page.locator("#restorePoint").selectOption(bandPoint);
      page.once("dialog", (d) => d.accept());
      await page.locator("#restoreBackup").click();
      await page.waitForFunction(
        () => document.querySelectorAll("#bandList > p").length === 2,
      );
      const recoveredBands = await (
        await page.request.get(base + "/api/projects/" + currentId)
      ).json();
      assert.deepEqual(
        recoveredBands.pieces.find((p) => p.id === originalBandPieceId)
          .sections,
        bp.sections,
      );
      const rectanglePicture = await page
        .locator("#fabric")
        .evaluate((c) => c.toDataURL());
      await page.locator("#pieceShape").selectOption("triangle");
      assert.notEqual(
        await page.locator("#fabric").evaluate((c) => c.toDataURL()),
        rectanglePicture,
      );
      await page.locator("#estimate").click();
      assert.match(
        await page.locator("#estimateResult").textContent(),
        /Apply or cancel the shape/,
      );
      await page.locator("#previewExport").click();
      assert.match(
        await page.locator("#exportStatus").textContent(),
        /Apply or cancel/,
      );
      await page.locator("#cancelShape").click();
      assert.equal(
        await page.locator("#fabric").evaluate((c) => c.toDataURL()),
        rectanglePicture,
      );
      await page.locator("#pieceShape").selectOption("triangle");
      await page.locator("#applyShape").click();
      assert.equal(
        await page.locator("#shapeWidthLabel").textContent(),
        "Base width (cm)",
      );
      assert.match(
        await page.locator("#chartGauge").textContent(),
        /does not define/,
      );
      await page.locator("#estimate").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#estimateResult")
          .textContent.includes("Total:"),
      );
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      const triangleProject = await (
        await page.request.get(base + "/api/projects/" + currentId)
      ).json();
      const triangle = triangleProject.pieces.find(
        (p) => p.id === originalBandPieceId,
      );
      assert.equal(triangle.shape, "triangle");
      const triangleEstimate = await (
        await page.request.post(base + "/api/estimate-piece", {
          data: { piece: triangle, allowance: 10 },
        })
      ).json();
      assert.ok(
        Math.abs(
          triangleEstimate.area_cm2 -
            (Number(triangle.fields.width) * Number(triangle.fields.length)) /
              2,
        ) < 0.00001,
      );
      assert.ok(
        Math.abs(
          triangleEstimate.bands[0].grams - bandEstimate.bands[0].grams * 0.25,
        ) < 0.00001,
      );
      assert.ok(
        Math.abs(
          triangleEstimate.bands[1].grams - bandEstimate.bands[1].grams * 0.75,
        ) < 0.00001,
      );
      await page.locator("#pieceShape").selectOption("circle");
      await page.locator("#applyShape").click();
      assert.equal(
        await page.locator("#shapeWidthLabel").textContent(),
        "Diameter (cm)",
      );
      assert.ok(await page.locator("#length").isHidden());
      await page.locator("#previewExport").click();
      await page.waitForFunction(
        () => !document.querySelector("#exportPages").hidden,
      );
      assert.match(
        await page.locator("#exportWarnings").textContent(),
        /round instructions/,
      );
      await page.locator("#exportDialog").evaluate((d) => d.close());
      await page.locator("#backupNow").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#backupActionStatus").textContent ===
            "Backup completed." && !document.querySelector("main").inert,
      );
      const shapePoint = (
        await (await page.request.get(base + "/api/backups")).json()
      ).points[0].id;
      await page.locator("#pieceShape").selectOption("oval");
      await page.locator("#applyShape").click();
      assert.ok(await page.locator("#length").isVisible());
      await page.locator("#restorePoint").selectOption(shapePoint);
      page.once("dialog", (d) => d.accept());
      await page.locator("#restoreBackup").click();
      await page.waitForFunction(
        () => document.querySelector("#pieceShape").value === "circle",
      );
      assert.ok(await page.locator("#length").isHidden());
      await page.locator("#createRoundChart").click();
      assert.equal(await page.locator("#roundDiagram g").count(), 6);
      await page.locator("#generateRoundText").click();
      await page.locator("#roundText").fill("My starting ring notes.");
      await page.locator("#roundText").press("Tab");
      await page.locator("#roundStitch").selectOption("ch");
      await page.locator("#roundDiagram g").first().click();
      assert.equal(
        await page.locator("#roundText").inputValue(),
        "My starting ring notes.",
      );
      assert.match(
        await page.locator("#roundReview").textContent(),
        /Round changed/,
      );
      await page.locator("#reviewRoundText").click();
      assert.match(await page.locator("#roundReview").textContent(), /match/);
      await page.locator("#roundStitch").selectOption("sc");
      await page.locator("#addRound").click();
      await page.locator("#roundSlots").fill("8");
      await page.locator("#resizeRound").click();
      assert.equal(await page.locator("#roundDiagram g").count(), 14);
      assert.match(
        await page.locator("#roundWarnings").textContent(),
        /Round 2 consumes 8/,
      );
      const joinedRound = await page.locator("#roundDiagram").innerHTML();
      await page.locator("#roundMode").selectOption("spiral");
      assert.notEqual(
        await page.locator("#roundDiagram").innerHTML(),
        joinedRound,
      );
      await page
        .getByText("Position a symbol manually", { exact: true })
        .click();
      await page.locator("#roundAngle").fill("15");
      await page.locator("#roundRadius").fill("5");
      await page.locator("#positionRoundSymbol").click();
      await page.locator("#roundDirection").selectOption("counterclockwise");
      const roundPngPromise = page.waitForEvent("download");
      await page.locator("#downloadRoundPng").click();
      const roundPng = await roundPngPromise;
      assert.ok(fs.statSync(await roundPng.path()).size > 1000);
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      const radialSaved = await (
        await page.request.get(base + "/api/projects/" + currentId)
      ).json();
      const radialChart = radialSaved.pieces.find(
        (p) => p.id === originalBandPieceId,
      ).roundChart;
      assert.equal(radialChart.mode, "spiral");
      assert.equal(radialChart.rounds[1].offsets[0].angle, 15);
      await page.reload();
      await page.waitForFunction(
        () => document.querySelectorAll("#roundDiagram g").length === 14,
      );
      assert.equal(
        await page.locator("#roundText").inputValue(),
        "My starting ring notes.",
      );
      assert.match(
        await page.locator("#roundReview").textContent(),
        /Round changed/,
      );
      await page.locator("#previewExport").click();
      await page.waitForFunction(
        () => !document.querySelector("#exportPages").hidden,
      );
      assert.match(
        await page.locator("#exportWarnings").textContent(),
        /Radial sample only/,
      );
      await page.locator("#exportDialog").evaluate((d) => d.close());
      await page.locator("#backupNow").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#backupActionStatus").textContent ===
            "Backup completed." && !document.querySelector("main").inert,
      );
      const radialPoint = (
        await (await page.request.get(base + "/api/backups")).json()
      ).points[0].id;
      await page.locator("#roundSelect").selectOption("1");
      page.once("dialog", (d) => d.accept());
      await page.locator("#removeRound").click();
      assert.equal(await page.locator("#roundDiagram g").count(), 6);
      await page.locator("#restorePoint").selectOption(radialPoint);
      page.once("dialog", (d) => d.accept());
      await page.locator("#restoreBackup").click();
      await page.waitForFunction(
        () => document.querySelectorAll("#roundDiagram g").length === 14,
      );
      const radialRecovered = await (
        await page.request.get(base + "/api/projects/" + currentId)
      ).json();
      assert.deepEqual(
        radialRecovered.pieces.find((p) => p.id === originalBandPieceId)
          .roundChart,
        radialChart,
      );
      await page.locator("#pieceShape").selectOption("triangle");
      await page
        .locator("#roundText")
        .fill("Draft retained during shape preview.");
      await page.locator("#roundText").press("Tab");
      assert.match(
        await page.locator("#roundStatus").textContent(),
        /pending design/,
      );
      await page.locator("#roundMode").selectOption("joined");
      assert.equal(
        await page.locator("#roundText").inputValue(),
        "Draft retained during shape preview.",
      );
      await page.locator("#cancelShape").click();
      await page.locator("#saveRoundText").click();
      const radialImage = radialSaved.stitches.find((s) => s.image);
      assert.ok(radialImage);
      await page.locator("#roundStitch").selectOption(radialImage.id);
      await page.locator("#roundDiagram g").first().click();
      assert.ok((await page.locator("#roundDiagram image").count()) > 0);
      await page.locator("#save").click();
      await page.waitForFunction(() =>
        document.querySelector("#status").textContent.includes("Saved locally"),
      );
      await page.reload();
      await page.waitForFunction(
        () => document.querySelectorAll("#roundDiagram g").length === 14,
      );
      assert.equal(
        await page.locator("#roundText").inputValue(),
        "Draft retained during shape preview.",
      );
      assert.ok((await page.locator("#roundDiagram image").count()) > 0);
      await page.locator("#previewExport").click();
      await page.waitForFunction(
        () => !document.querySelector("#exportPages").hidden,
      );
      await page.locator("#exportDialog").evaluate((d) => d.close());
      await page.locator("#roundDiagram g").nth(1).press("Enter");
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.getAttribute("data-round-slot"),
        ),
        "0-1",
      );
      await page.locator("#roundFoundation").selectOption("chain");
      await page.locator("#foundationChains").selectOption("5");
      await page.locator("#roundChains").selectOption("3");
      await page.locator("#roundChainCounts").check();
      await page.locator("#roundJoin").selectOption("first-chain");
      assert.match(await page.locator("#roundWarnings").textContent(), /spiral conflicts/);
      assert.match(await page.locator("#roundGenerated").textContent(), /Chain 5; join into a ring/);
      await page.locator("#save").click();
      await page.waitForFunction(() => document.querySelector("#status").textContent.includes("Saved locally"));
      await page.reload();
      await page.waitForFunction(() => document.querySelector("#roundFoundation").value === "chain");
      assert.equal(await page.locator("#foundationChains").inputValue(), "5");
      assert.equal(await page.locator("#roundChains").inputValue(), "3");
      assert.equal(await page.locator("#roundChainCounts").isChecked(), true);
      assert.equal(await page.locator("#roundJoin").inputValue(), "first-chain");
      assert.equal(await page.locator("#roundText").inputValue(), "Draft retained during shape preview.");
      await page.getByText("Stitch placement and shaping counts", {exact:true}).click();
      await page.locator("#roundSelect").selectOption("1");
      await page.locator("#roundPlacement").selectOption("sequential");
      assert.equal(await page.locator("#roundPlacementRows tr").count(), 8);
      assert.match(await page.locator("#roundPlacementRows").textContent(), /previous-round stitch/);
      assert.match(await page.locator("#roundShapingSummary").textContent(), /Net change/);
      await page.locator("#save").click();
      await page.waitForFunction(() => document.querySelector("#status").textContent.includes("Saved locally"));
      await page.reload();
      await page.waitForFunction(() => document.querySelectorAll("#roundDiagram g").length === 14);
      await page.locator("#roundSelect").selectOption("1");
      assert.equal(await page.locator("#roundPlacement").inputValue(), "sequential");
      assert.match(await page.locator("#roundGenerated").textContent(), /Sequential placement in working order/);
      const assemblyKey = await page.locator('#assemblyCopy').inputValue();
      await page.locator('#assemblyx').fill('42');
      await page.locator('#assemblyx').dispatchEvent('change');
      await page.locator('#assemblyry').fill('90');
      await page.locator('#assemblyry').dispatchEvent('change');
      assert.match(await page.locator('#assemblyxValue').textContent(), /42 cm/);
      const assemblyDownload=page.waitForEvent('download');
      await page.locator('#downloadAssembly').click();
      const assemblyFile=await (await assemblyDownload).path();
      assert.ok(fs.statSync(assemblyFile).size>1000);
      await page.locator('#save').click();
      await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved locally'));
      await page.reload();
      await page.waitForFunction(()=>document.querySelectorAll('#assemblyCopy option').length>0);
      await page.locator('#assemblyCopy').selectOption(assemblyKey);
      assert.equal(await page.locator('#assemblyx').inputValue(),'42');
      assert.equal(await page.locator('#assemblyry').inputValue(),'90');
      await page.locator('#assemblyCanvas').screenshot({path:'/tmp/stitchinator-assembly-'+engine.name()+'.png'});
      await page.locator('#assemblyNotes').fill('Attach handles after the side seams.');
      await page.locator('#saveAssemblyNotes').click();
      const seamCopies=await page.locator('#seamA option').evaluateAll(options=>options.map(o=>o.value));
      assert.ok(seamCopies.length>=2);
      await page.locator('#seamName').fill('Side seam concept');
      await page.locator('#seamA').selectOption(seamCopies[0]);
      await page.locator('#seamAEdge').selectOption('left');
      await page.locator('#seamB').selectOption(seamCopies[1]);
      await page.locator('#seamBEdge').selectOption('right');
      await page.locator('#seamNote').fill('Match row ends; check easing.');
      await page.locator('#saveSeam').click();
      assert.match(await page.locator('#assemblyPlanReport').textContent(), /Side seam concept/);
      await page.locator('#assemblyCopy').selectOption(seamCopies[0]);
      await page.locator('#foldEnabled').check();
      await page.locator('#foldAngle').fill('90');
      await page.locator('#foldAngle').dispatchEvent('change');
      assert.match(await page.locator('#assemblyPlanReport').textContent(), /Geometry changed/);
      assert.match(await page.locator('#assemblyPlanReport').textContent(), /90°/);
      await page.locator('#assemblyCanvas').screenshot({path:'/tmp/stitchinator-folded-'+engine.name()+'.png'});
      // A note draft must survive blocked geometry changes and project saves.
      await page.locator('#assemblyNotes').fill('Draft retained while folding is blocked.');
      await page.locator('#foldAngle').fill('45');
      await page.locator('#foldAngle').dispatchEvent('change');
      assert.equal(await page.locator('#foldAngle').inputValue(),'90');
      assert.equal(await page.locator('#assemblyNotes').inputValue(),'Draft retained while folding is blocked.');
      await page.locator('#saveAssemblyNotes').click();
      await page.locator('#save').click();
      await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved locally'));
      await page.reload();
      await page.waitForFunction(()=>document.querySelector('#assemblyNotes').value==='Draft retained while folding is blocked.');
      await page.locator('#assemblyCopy').selectOption(seamCopies[0]);
      assert.equal(await page.locator('#foldEnabled').isChecked(),true);
      assert.equal(await page.locator('#foldAngle').inputValue(),'90');
      assert.match(await page.locator('#assemblyPlanReport').textContent(), /Side seam concept/);
      await page.locator('#previewExport').click();
      await page.waitForFunction(()=>!document.querySelector('#exportPages').hidden);
      await page.locator('#exportDialog').evaluate(d=>d.close());
      await page.locator('#seamSelect').selectOption({label:'Side seam concept'});
      await page.locator('#previewAlignment').click();
      assert.match(await page.locator('#alignmentStatus').textContent(), /Preview only/);
      await page.locator('#cancelAlignment').click();
      await page.locator('#addFold').click();
      assert.equal(await page.locator('#foldSelect option').count(),2);
      await page.locator('#foldPosition').fill('75');await page.locator('#foldPosition').dispatchEvent('change');
      await page.locator('#foldAngle').fill('-90');await page.locator('#foldAngle').dispatchEvent('change');
      await page.locator('#addPhoto').setInputFiles({name:'Progress.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
      await page.waitForFunction(()=>document.querySelectorAll('#projectPhotos img').length===1);
      await page.locator('#previewBag').click();
      assert.match(await page.locator('#bagStatus').textContent(), /Preview only/);
      await page.locator('#applyBag').click();
      assert.match(await page.locator('#bagStatus').textContent(), /Bag pieces added/);
      await page.locator('#terminology').selectOption('DE');await page.locator('#addStandardStitches').check();await page.locator('#applyTerminology').click();
      assert.equal(await page.locator('#terminology').inputValue(),'DE');
      await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved locally'));
      await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#projectPhotos img').length===1);
      assert.equal(await page.locator('#terminology').inputValue(),'DE');
      assert.match(await page.locator('#assemblyPlanReport').textContent(),/Bag 1 seam/);
      await page.locator('#projectCraft').selectOption('knitting');await page.locator('#knittingMode').selectOption('round');await page.locator('#applyCraft').click();
      assert.equal(await page.locator('#radialSection').isHidden(),true);
      await page.locator('#openWorking').click();await page.locator('#workingNext').click();assert.match(await page.locator('#workingTitle').textContent(),/round 2/);await page.locator('#closeWorking').click();
      await page.locator('#inventoryPanel').evaluate(el=>el.open=true);
      await page.getByText('Offline starter yarn catalog',{exact:true}).click();
      await page.locator('#catalogSearch').fill('Paris');await page.locator('#useCatalogYarn').click();
      assert.equal(await page.locator('#yarn_product').inputValue(),'Paris');assert.equal(await page.locator('#yarn_remaining_grams').inputValue(),'0');
      page.once('dialog',d=>d.accept());await page.locator('#newYarn').click();
      const sharedSource=structuredClone(bundle);sharedSource.id='test-pattern-source';sharedSource.fields.name='Shared pattern test';
      assert.ok(sharedSource.patterns.length>0);
      const sourceResponse=await page.request.put(base+'/api/projects/test-pattern-source',{headers:{'X-Stitchinator':'1','X-Project-Version':'0'},data:sharedSource});assert.equal(sourceResponse.ok(),true);
      await page.locator('#refreshPatternSources').evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
      await page.locator('#refreshPatternSources').click();await page.waitForFunction(()=>[...document.querySelector('#patternSource').options].some(o=>o.value==='test-pattern-source'));
      await page.locator('#patternSource').selectOption('test-pattern-source');await page.locator('#loadPatternSource').click();await page.waitForFunction(()=>document.querySelector('#sourcePattern').options.length>0);
      await page.locator('#previewLibraryPattern').click();assert.match(await page.locator('#libraryPatternStatus').textContent(),/Preview:/);
      await page.locator('#applyLibraryPattern').click();assert.match(await page.locator('#libraryPatternStatus').textContent(),/snapshot applied/);
      await page.locator('#exportAllPieces').check();await page.locator('#previewExport').click();await page.waitForFunction(()=>!document.querySelector('#exportPages').hidden);await page.locator('#exportDialog').evaluate(d=>d.close());
      await page.locator('#projectCraft').selectOption('crochet');await page.locator('#applyCraft').click();
      await page.locator('#pieceSelect').selectOption(radialSaved.pieces.find(p=>p.roundChart).id);
      await page.locator('#roundSelect').selectOption('1');
      await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved locally'));
      const currentForShaping=await page.evaluate(async()=>{const id=localStorage.getItem('stitchinator-active-project');return await (await fetch('/api/projects/'+id)).json();});
      const shapingPiece=currentForShaping.pieces.find(p=>p.id===currentForShaping.activePieceId),priorRound=shapingPiece.roundChart.rounds[0];
      const priorCount=priorRound.cells.reduce((n,id)=>n+currentForShaping.stitches.find(s=>s.id===id).produced,0)+(priorRound.construction?.counts?1:0);
      await page.locator('#openShapingSettings').click();await page.locator('#shapingTarget').fill(String(priorCount*2));
      await page.locator('#previewShaping').click();assert.match(await page.locator('#shapingStatus').textContent(),/Preview only/);
      await page.locator('#applyShaping').click();assert.match(await page.locator('#shapingStatus').textContent(),/placement applied/);
      await page.locator('#closeShapingSettings').click();
      // Symbol placement is saved per occurrence, independently of stitch counts.
      await page.locator('#symbolAnchor').evaluate(el=>el.closest('details').open=true);
      await page.locator('#chartTool').selectOption('position');
      await page.locator('#symbolAnchor').selectOption('bottom');
      await page.locator('#symbolSnap').selectOption('top-left');
      await page.locator('#symbolRotation').fill('90');
      await page.locator('#chart button').first().click();
      assert.match(await page.locator('#chart .placedSymbol').first().getAttribute('style'),/rotate\(90deg\)/);
      await page.locator('#roundPositionSlot').evaluate(el=>el.closest('details').open=true);
      await page.locator('#roundRotation').fill('-45');
      await page.locator('#roundAnchor').selectOption('bottom');
      await page.locator('#roundSnap').selectOption('bottom-right');
      await page.locator('#positionRoundSymbol').click();
      assert.match(await page.locator('[data-round-slot="1-0"] image, [data-round-slot="1-0"] text').first().getAttribute('transform'),/rotate\(-45/);
      await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved locally'));
      await page.reload();await page.waitForSelector('#chart .placedSymbol');
      assert.match(await page.locator('#chart .placedSymbol').first().getAttribute('style'),/rotate\(90deg\)/);
      const placementData=await page.evaluate(async()=>await(await fetch('/api/projects/'+localStorage.getItem('stitchinator-active-project'))).json());
      const placedPiece=placementData.pieces.find(p=>p.id===placementData.activePieceId);
      assert.equal(placedPiece.roundChart.rounds[1].offsets[0].visual.rotation,-45);
      for(const key of ['picot3','turn3','dtr','fpdc','popcorn5'])assert.ok(placementData.stitches.find(s=>s.termKey===key)?.image);
      await page.locator('#symbolAnchor').evaluate(el=>el.closest('details').open=true);
      await page.locator('#symbolSnap').selectOption('auto');
      await page.locator('#symbolAnchor').selectOption('top');await page.locator('#symbolRotation').fill('0');
      await page.locator('#snapOrientation').selectOption('along');
      await page.locator('#guideKind').evaluate(el=>el.closest('details').open=true);
      await page.locator('#guideX').fill('0');await page.locator('#guideY').fill('0.5');
      await page.locator('#guideX2').fill(String(placedPiece.cols));await page.locator('#guideY2').fill('0.5');
      await page.locator('#addDiagramGuide').click();assert.match(await page.locator('#guideStatus').textContent(),/1 custom guides/);
      await page.locator('#chartTool').selectOption('position');await page.locator('#chart button').first().click();
      assert.match(await page.locator('#chart .placedSymbol').first().getAttribute('style'),/rotate\(90deg\)/);
      await page.locator('#symbolNoSnap').check();await page.locator('#chart button').first().click();
      assert.match(await page.locator('#chart .placedSymbol').first().getAttribute('style'),/rotate\(0deg\)/);
      assert.equal(await page.locator('#symbolNoSnap').isChecked(),false);
      const grid=await page.locator('#chart').boundingBox(),source=await page.locator('#chart button').first().boundingBox();
      await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();
      await page.mouse.move(grid.x+grid.width*2.5/placedPiece.cols,grid.y+grid.height*.85/placedPiece.rows,{steps:8});await page.mouse.up();
      await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Saved locally'));
      const guideData=await page.evaluate(async()=>await(await fetch('/api/projects/'+localStorage.getItem('stitchinator-active-project'))).json());
      const guidePiece=guideData.pieces.find(p=>p.id===guideData.activePieceId),firstIndex=(guidePiece.rows-1)*guidePiece.cols;
      assert.equal(guidePiece.cellPlacements[firstIndex].target,'vertex',JSON.stringify({pose:guidePiece.cellPlacements[firstIndex],cols:guidePiece.cols,rows:guidePiece.rows,oldCols:placedPiece.cols,oldRows:placedPiece.rows,grid,source,placements:guidePiece.cellPlacements}));
      assert.equal(guideData.diagramSnapping.orientation,'along');assert.equal(guidePiece.chartGuides.length,1);
      await page.locator('#snapEnabled').uncheck();await page.locator('#chart button').first().click();
      assert.match(await page.locator('#chart .placedSymbol').first().getAttribute('style'),/rotate\(0deg\)/);
      await page.locator('#snapEnabled').check();
      await page.setViewportSize({ width: 1100, height: 900 });
      await page.screenshot({
        path: "/tmp/stitchinator-" + engine.name() + ".png",
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      await browser.close();
      console.log(
        engine.name() +
          ": chart, drawn/SVG/PNG/copied symbols, selected repeats, count warnings, estimate and persistence passed",
      );
    }
  } finally {
    server.kill();
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

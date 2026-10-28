# Frequently Asked Questions

Planning draft: describes intended behavior, not an available implementation.

## Who is Stitchinator for?

A private crochet project initially for the owner's girlfriend. Knitting is planned later.

## Does it require internet?

Everyday use is offline. Downloads and manual updates may use internet. Run locally through Docker and access it from a browser on the same computer, without login.

## Which systems are supported?

Windows, Linux, and macOS are targets. Initial testing is planned only on Kubuntu 26.04 with Firefox, on a Framework i5-1240P laptop with 32 GB RAM. No platform has yet been verified by implementation tests.

## What does the 3D preview show?

Overall shape, colors, and approximate stitch texture. Realistic drape and individual-stitch rendering are not initial requirements.

## Why might a yarn estimate be unavailable?

The relevant yarn/stitch combination needs measured swatch data. Designing can continue without an estimate. Each yarn has a separate estimate.

## Can I change terminology?

Select US, UK, or German stitch names and abbreviations per project. Interface and instruction prose remain US English. Initial measurements are metric.

## Can I customize exports?

Select contents for PDF documents or PNG pictures, such as instructions alone or a picture with yarn requirements. Warn before exporting instructions with unresolved chart issues.

## How is work protected?

Autosave, crash recovery, portable project files, and explicitly named searchable revisions are required. Whole-collection backups use an initial full backup, monthly full backups on the first, and daily incrementals, retaining three monthly cycles outside the container. Restore requires a successful safety backup first.

## How will private releases be delivered?

Build Docker images locally from source or load a supplied image archive. Updates are manual; data-changing updates require a full safety backup. Installation commands remain pending implementation.

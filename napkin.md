napkin

Knitt/Croceht App: my girlfriend wouod like me to recreate the web app https://castonlab.com as stand alone cross platform. I am thinking of doing this in rust. What is your opinion and suggestions. Naturally I would increase the capabilty of the sand alone over the present web app
I think this is actually a very good Rust project, but I would be careful about trying to create a 1:1 clone of Cast On Lab first. From what I can see, the current application is primarily a chart editor for knitting patterns with symbol libraries, save/load functionality, and export features.
castonlab

My recommendation would be:

Phase 1: Clone the Core Experience
Recreate the fundamental capabilities:

Grid editor
Knitting symbols
Crochet symbols
Undo/redo
Save/load project
SVG export
PDF export
Pattern library
Think of this as your Minimum Viable Product.

Phase 2: Surpass the Original
This is where a standalone application gains advantages over a browser solution.

Some ideas:

1. Offline First
One of the biggest advantages.

No internet required
Local project storage
Portable project bundles
Optional cloud sync
Many crafters travel and attend knitting groups where internet may be unreliable.

2. Project Management
Something like:

Project
├── Charts
├── Notes
├── Photos
├── Yarn Inventory
├── Progress Tracking
└── Measurements
Essentially becoming:

Chart editor
Pattern manager
Project manager
all in one application.

3. Yarn Database
Users could maintain:

Manufacturer
Color
Dye lot
Weight
Quantity on hand
Cost
Then patterns could automatically calculate:

Required yarn
Estimated cost
Missing inventory
4. Pattern Calculations
This would be a killer feature.

Users enter:

Gauge
Needle size
Finished size
Application calculates:

Stitch counts
Row counts
Scaling
Very useful for sweaters and garments.

5. Modern Export System
Generate:

PDF
SVG
PNG
Markdown
HTML
Perhaps even:

ePub
for digital pattern distribution.

6. Companion Mobile App
A huge differentiator.

Desktop:

Design patterns
Mobile:

Track progress
Row counter
View charts
Mark completed rows
Sync between devices.

7. 3D Visualization
This is ambitious, but very interesting.

I noticed some crochet-related tools are beginning to offer 3D previews.
crochetlab

Imagine:

Pattern
   ↓
Mesh Generator
   ↓
3D Viewer
For crochet amigurumi especially this could be revolutionary.

Technology Stack
Since you're considering Rust:

Backend/Core
Rust is an excellent choice for:

File formats
Calculations
Pattern logic
Rendering engine
Export engine
UI Options
Option A: Tauri + Rust (My Recommendation)
Rust Core
    +
Tauri
    +
HTML/CSS/TypeScript
Advantages:

Cross-platform
Windows
Linux
macOS
Small binaries compared to Electron.

Option B: Rust + egui
Rust
 └── egui
Advantages:

Pure Rust
Single language
Fast development
Disadvantages:

Less polished UI
Harder to make look "native"
Option C: Rust + Flutter Frontend
Flutter UI
     |
Rust Core
Best if you want mobile support later.

Architecture I'd Use
Because of your interest in modularity and maintainability, I'd separate it into libraries:

knitinator-core
    Pattern Models

knitinator-symbols
    Stitch Definitions

knitinator-renderer
    SVG/PDF Rendering

knitinator-storage
    Save Formats

knitinator-calculator
    Gauge Mathematics

knitinator-desktop
    Tauri Frontend
Very similar to how you've been thinking about separating your Document-inator family into focused modules.

A Feature I Would Absolutely Add
Version control for patterns.

Imagine:

Revision 1
Revision 2
Revision 3
with:

Compare charts
Restore revision
View differences
Knitters constantly tweak patterns and frequently want to go back.

A Git-like system for patterns would be a genuine differentiator.

Commercial Potential
Of all crafting software niches, knitting and crochet software is surprisingly underserved.

Most existing tools are:

Old desktop applications
Browser-only applications
Subscription services
Limited chart editors
A modern:

Offline-first
Cross-platform
Fast
Privacy-respecting
application written in Rust could easily become one of the best tools available in that space.

If it were my project, I would choose Rust + Tauri, use an SVG-based rendering engine, and design the core as reusable Rust libraries from day one. That would give you a solid foundation for future desktop, mobile, and even web editions without rewriting the pattern logic.






Favicon typeFavicon type
Quellen


Nachricht an Copilot senden

KI-generierte Inhalte können fehlerhaft sein

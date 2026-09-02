> **The brief.** This is the prompt that produced this world, reproduced verbatim.
> Everything in this directory — the reconnaissance database, the asset generators, the Three.js
> runtime, the interiors, the QA harness and the reports — was built autonomously from it by
> Claude Fable 5.1 agents. Read [`FINAL_QA_REPORT.md`](FINAL_QA_REPORT.md) and
> [`qa/discrepancies.md`](qa/discrepancies.md) for what the brief asked versus what was delivered.

---

# AUTONOMOUS BUILD PROMPT — PHOTOREALISTIC INTERACTIVE SAN FRANCISCO UNION SQUARE DIGITAL TWIN

Build a complete, high-quality, interactive **3D reconstruction of San Francisco Union Square and its immediately surrounding blocks**.

This is not a toy scene and not a handful of representative buildings.

The goal is to create a convincing **browser-scale urban digital twin** where a user can walk through Union Square, recognize the real streets and buildings, see the actual storefronts surrounding the square, enter major stores, interact with selected interiors, watch pedestrians and vehicles move through the environment, and immediately recognize the location as present-day San Francisco.

The shipped runtime must use:

**Three.js only.**

You may use **BPL / Blender Python Library as an offline procedural asset-generation and reconstruction tool**, but Blender must not be part of the runtime.

The final deliverable must run as a Three.js web application.

---

# PRIMARY EXPERIENCE

When the application loads, the viewer should immediately see:

**San Francisco Union Square.**

The reconstruction should include the square itself and a sufficiently large surrounding area that the environment feels like a real neighborhood rather than an isolated plaza floating in space.

At minimum reconstruct the area around:

* Union Square
* Powell Street
* Geary Street
* Post Street
* Stockton Street

Then extend outward where necessary to preserve important sightlines and recognizable urban context.

The scene must prominently include accurate representations of major anchors such as:

* Apple Union Square
* Nintendo SAN FRANCISCO
* Westin St. Francis
* Union Square plaza
* Dewey Monument
* surrounding department stores
* luxury storefronts
* hotels
* restaurants
* street-level retail
* transit infrastructure
* sidewalks
* intersections
* street furniture

Nintendo SAN FRANCISCO should be reconstructed at its real location at **331 Powell Street, at Powell and Geary**.

Apple Union Square should be reconstructed at its real location at **300 Post Street**.

Do not treat these stores as generic boxes with logos.

They should be recognizable architectural spaces.

---

# CORE QUALITY TARGET

The result should look substantially closer to:

> an explorable Google Earth / AAA open-world urban block

than:

> a procedural Three.js city demo.

A person familiar with Union Square should be able to orient themselves without a minimap.

They should recognize:

* the plaza
* building silhouettes
* street widths
* storefront ordering
* intersections
* architectural façades
* prominent signs
* entrances
* major interior spaces
* topography
* recognizable surrounding structures

---

# REFERENCE-GATHERING PHASE

Before writing significant scene code, perform a dedicated reconstruction phase.

Use multiple parallel research agents.

Use public web resources, official business pages, public photographs, available maps, and Google Earth / Google Maps / Street View as **visual and spatial references**.

Do not blindly hallucinate geography.

Do not extract, redistribute, or ship proprietary Google Earth 3D meshes or textures.

Instead:

1. inspect real-world imagery;
2. infer geometry;
3. reconstruct it procedurally or through custom authored assets;
4. independently verify the reconstruction against multiple views.

Treat Google Earth as a **ground-truth visual reference**, not as an asset package.

---

# PARALLEL RECONSTRUCTION SWARM

The first major phase must use **aggressive parallel subagents**.

Do not have a single agent manually investigate every building.

Launch independent agents for geographic sectors and domains.

For example:

## GEO AGENT A — UNION SQUARE PLAZA

Research and reconstruct:

* exact plaza footprint
* elevation changes
* Dewey Monument
* stairs
* terraces
* paving patterns
* seating
* trees
* planters
* lighting
* underground-garage entrances
* surrounding curb geometry

Produce:

* dimensions
* reference images
* object list
* spatial coordinates
* uncertainty notes

---

## GEO AGENT B — WEST SIDE / POWELL STREET

Research every visible façade and ground-floor business facing the square.

Record:

* building footprint
* height
* façade bays
* windows
* doors
* awnings
* business names
* storefront ordering
* signage placement

---

## GEO AGENT C — EAST SIDE / STOCKTON STREET

Perform the same reconstruction independently.

---

## GEO AGENT D — NORTH SIDE / POST STREET

Prioritize:

* Apple Union Square
* adjacent retail
* surrounding architecture
* sidewalks
* intersections

---

## GEO AGENT E — SOUTH SIDE / GEARY STREET

Prioritize:

* Westin St. Francis
* Nintendo SAN FRANCISCO vicinity
* neighboring retail
* hotel entrances
* architectural details

---

## STORE CENSUS AGENT

Build a current storefront database.

Walk every street edge within the reconstruction boundary.

For each visible business determine:

```text
business name
street address
business category
building
approximate storefront width
logo/signage
entrance location
window arrangement
open/closed status where verifiable
confidence
source
```

Do not silently invent uncertain businesses.

Mark uncertainty.

---

## APPLE STORE AGENT

Study Apple Union Square independently.

Reconstruct recognizable features including:

* monumental glazing
* large sliding façade
* metal exterior panels
* interior floor structure
* stairs
* product tables
* large display area
* trees / indoor-outdoor relationship
* rear/plaza relationship where visible

Build a simplified but convincing explorable interior.

---

## NINTENDO STORE AGENT

Study Nintendo SAN FRANCISCO independently.

Reconstruct:

* real storefront position
* historic surrounding façade
* bright Nintendo entrance treatment
* major interior zones
* product shelving
* large screens
* character displays
* demo stations

Represent recognizable Nintendo-inspired merchandise/display zones without requiring every individual retail SKU.

---

# BPL PROCEDURAL ASSET PIPELINE

Use BPL aggressively for offline asset creation where it improves quality.

BPL should generate reusable high-quality urban components such as:

* windows
* cornices
* façade trims
* doors
* columns
* pilasters
* balconies
* fire escapes
* awnings
* storefront frames
* streetlights
* traffic lights
* parking meters
* utility boxes
* benches
* tree planters
* signs
* bollards
* trash cans
* street barriers
* bus shelters
* retail shelving
* product tables
* display pedestals

Use procedural parameters rather than manually modeling hundreds of nearly identical objects.

Example conceptual interface:

```python
create_storefront(
    width=8.4,
    height=5.2,
    bays=3,
    frame_material="black_metal",
    glazing="clear",
    sign_type="fascia",
)
```

BPL output may be exported as optimized GLB/GLTF.

The browser must load these assets through Three.js.

---

# ASSET GENERATION SUBAGENTS

Launch additional parallel agents.

## BPL ARCHITECTURE AGENT

Build reusable façade modules.

## BPL STREET-FURNITURE AGENT

Build:

* lamps
* signs
* hydrants
* bollards
* benches
* trash bins
* newspaper boxes
* traffic infrastructure

## BPL RETAIL AGENT

Build:

* shelving
* counters
* tables
* display racks
* checkout stations
* product stand-ins

## BPL VEHICLE AGENT

Create optimized vehicle families:

* sedans
* SUVs
* taxis
* delivery vans
* buses

## BPL VEGETATION AGENT

Build low-cost but convincing:

* street trees
* planters
* shrubs
* seasonal plaza vegetation

Run these agents simultaneously.

---

# GEOGRAPHIC COORDINATE SYSTEM

Do not place buildings by eye in arbitrary scene coordinates.

Create a consistent geospatial mapping.

Choose a geographic origin near Union Square.

Convert:

```text
latitude
longitude
elevation
```

into local Three.js coordinates.

Example:

```ts
world = geoToLocal(lat, lon, elevation)
```

Maintain real relative:

* building positions
* street widths
* sidewalk widths
* intersections
* plaza dimensions
* terrain slope

San Francisco topography matters.

The environment should not accidentally become perfectly flat.

---

# BUILDING RECONSTRUCTION

Buildings must have multiple levels of geometric fidelity.

## LEVEL 1 — MASSING

Correct:

* footprint
* height
* setbacks
* roofline

## LEVEL 2 — FAÇADE STRUCTURE

Add:

* window spacing
* floor divisions
* major columns
* façade bays
* entrances
* cornices

## LEVEL 3 — STREET-LEVEL DETAIL

Street level receives the highest fidelity.

Model:

* storefront glazing
* doors
* awnings
* logos
* display windows
* vestibules
* façade materials
* signage
* lighting

Humans perceive this environment primarily from street level.

Allocate geometry accordingly.

---

# ALL VISIBLE STOREFRONTS

Every storefront directly surrounding Union Square must have an identity where it can be verified.

Avoid:

```text
SHOP
STORE
RETAIL
CAFE
```

generic placeholder signage.

A real storefront should display the real business identity where current information is available.

The Store Census Agent must validate this.

If a storefront's current occupancy cannot be confidently determined:

* recreate the architecture accurately;
* use visually neutral treatment;
* mark it internally as unresolved.

Do not hallucinate a famous brand into an unknown location.

---

# STOREFRONT INTERACTION

Storefronts should be selectable.

When the player looks at or approaches a store:

* subtle highlight
* store name
* category
* interaction affordance

Selected major stores should support entry.

At minimum:

**Apple Union Square**

and

**Nintendo SAN FRANCISCO**

must be explorable.

Add several additional major accessible storefronts if references and time permit.

---

# NINTENDO INTERIOR

Nintendo should feel dramatically different from the street.

Build an energetic retail interior containing recognizable zones such as:

* Mario
* Zelda
* Animal Crossing
* Pikmin
* hardware/demo area
* merchandise wall
* display statues
* large game screen

Interactions can include:

* activate display screen
* inspect product
* rotate product model
* trigger character display animation
* interact with demo kiosk
* collect optional virtual souvenir

Do not make this simply a static showroom.

---

# APPLE INTERIOR

Apple should emphasize:

* scale
* glass
* openness
* natural materials
* large product tables
* architectural minimalism
* huge screens
* stairs
* indoor trees / greenery

Interactions:

* inspect devices
* activate screen demonstrations
* move between levels
* sit at tables
* enter presentation area

Focus on architectural recognizability rather than reproducing every current product SKU.

---

# UNION SQUARE PLAZA

The plaza itself should be an active environment.

Include:

* pedestrians
* seated people
* tourists
* photographers
* shoppers
* pigeons
* trees
* café activity where appropriate
* monument
* plaza furniture

Different NPCs should behave differently.

Examples:

```text
tourist → walks → stops → photographs monument

shopper → exits store → checks phone → walks away

couple → sits on bench → talks

commuter → crosses square quickly

visitor → studies storefront → enters Nintendo

pedestrian → waits for signal → crosses street
```

---

# PEDESTRIAN SYSTEM

Create a lightweight crowd system directly in Three.js.

No external game engine.

Construct a navigation graph covering:

* sidewalks
* crosswalks
* plaza paths
* entrances
* interior routes

Agents follow graph paths.

Implement local avoidance approximately.

NPC state:

```ts
interface Pedestrian {
  currentNode;
  destination;
  speed;
  behavior;
  waitTime;
  animationState;
}
```

Use many visually varied pedestrians.

Avoid obvious synchronized movement.

---

# VEHICLE SYSTEM

Populate surrounding streets.

Include:

* passenger vehicles
* rideshare-like vehicles
* taxis
* delivery vans
* buses where appropriate
* bicycles

Vehicles should follow street splines.

Respect:

* lanes
* intersections
* traffic lights
* pedestrian crossings

Cars should not simply loop through each other.

---

# CABLE CAR / TRANSIT CONTEXT

Powell Street has unusually strong San Francisco identity.

Where geographically appropriate, reproduce visible transit elements accurately.

If cable-car infrastructure enters the reconstruction boundary, represent:

* rails
* overhead/context infrastructure where applicable
* stops
* moving cable car

Do not add transit merely for decoration if it is geographically incorrect.

---

# INTERACTIVE CITY SYSTEMS

Make the environment reactive.

Support:

* doors opening
* traffic lights cycling
* pedestrians crossing
* store displays animating
* elevators/escalators where implemented
* screens playing local generated content
* vehicles stopping
* plaza lights switching on at night
* store interiors illuminating dynamically

---

# TIME OF DAY

Support at least:

```text
DAY
SUNSET
NIGHT
```

Day mode should be the primary reference-validation mode.

Night mode should create:

* illuminated storefronts
* hotel windows
* streetlights
* traffic lights
* interior visibility
* glowing retail signage

Union Square should remain recognizable under all conditions.

---

# MATERIAL FIDELITY

Do not rely on flat colors.

Build a reusable urban material library:

* granite
* limestone
* concrete
* painted plaster
* brick
* clear glass
* tinted glass
* brushed aluminum
* stainless steel
* brass
* asphalt
* painted road markings
* sidewalk concrete
* polished retail flooring
* wood
* fabric awnings

Use:

```text
roughness
metalness
normal variation
environment reflection
texture scale
```

appropriately.

---

# SIGNAGE

Signs are essential to recognition.

Use high-resolution text or vector-like signage where possible.

Store logos must:

* face correct direction
* have plausible proportions
* occupy correct façade location

Avoid blurry billboard-style textures pasted over entire façades.

---

# PLAYER EXPERIENCE

Support:

## WALK MODE

Human-scale WASD navigation.

Approximate eye height:

```text
1.65–1.75 meters
```

Include:

* collision against buildings
* sidewalk movement
* store entry
* stairs

## ORBIT MODE

Inspect entire environment.

## CINEMATIC TOUR

Automatically visit:

1. aerial Union Square
2. Dewey Monument
3. Powell Street
4. Nintendo
5. Westin St. Francis
6. Apple
7. plaza activity
8. sunset skyline

---

# VISUAL REFERENCE MODE

Implement a developer-only validation mode.

For important camera positions:

```text
reference image
rendered scene
```

should be compared side by side or via overlay.

Support opacity slider if practical:

```text
REFERENCE 50%
RENDER 50%
```

Use this to verify reconstruction.

This mode is critical.

---

# CAMERA-MATCH VALIDATION

Create at least **20 known reference viewpoints**.

Examples:

* each corner of Union Square
* center of plaza facing each direction
* Apple frontal view
* Nintendo frontal view
* Powell/Geary intersection
* Post/Stockton intersection
* Westin façade
* elevated overview

For each:

1. reproduce approximate camera position;
2. reproduce field of view;
3. render screenshot;
4. compare against reference;
5. identify major disagreement.

---

# GEOMETRIC QA AGENT

Launch a dedicated independent geometry reviewer.

It should look for:

* wrong building height
* wrong footprint
* wrong street width
* missing setback
* wrong façade spacing
* misplaced storefront
* incorrect intersection
* incorrect plaza dimensions

It should not modify the scene initially.

It should produce an error report.

Then correction agents fix those errors.

---

# SEMANTIC QA AGENT

Independently verify:

> Is the correct business actually in the correct location?

Inspect every street-facing business.

Create:

```text
✓ verified
? uncertain
✗ incorrect
```

report.

Any incorrect high-visibility storefront is a blocking issue.

---

# VISUAL QA AGENTS

Run multiple independent reviewers.

## QA-A — ARCHITECT

Judge proportions and architecture.

## QA-B — SF LOCAL / GEO REVIEWER

Judge whether the scene feels geographically correct.

## QA-C — TECHNICAL ARTIST

Judge:

* materials
* lighting
* texture repetition
* LOD
* geometry artifacts

## QA-D — GAME ENVIRONMENT ARTIST

Judge:

* visual density
* street-level storytelling
* composition
* environmental believability

## QA-E — INTERACTION REVIEWER

Walk through the environment and test every accessible store and object.

Run them in parallel.

---

# SCREENSHOT-DRIVEN SELF-VERIFICATION

At every major milestone:

```text
BUILD
→ RUN
→ CAPTURE SCREENSHOTS
→ COMPARE TO REFERENCES
→ IDENTIFY TOP 10 DISCREPANCIES
→ FIX
→ CAPTURE AGAIN
```

Repeat.

Do not trust source code inspection.

The final artifact is visual.

Visual verification is mandatory.

---

# PIXEL / FEATURE COMPARISON

Where possible, compute approximate image similarity metrics.

Do not optimize blindly for pixel-perfect reproduction because:

* lighting differs
* imagery dates differ
* traffic differs
* vegetation differs

Instead compare structural features:

* skyline
* building edges
* façade proportions
* road boundaries
* monument location
* storefront placement
* major color regions

Automated metrics should complement visual review, not replace it.

---

# COMPLETENESS AUDIT

Create a spatial checklist.

Divide the map into cells.

For each cell inspect:

```text
terrain
building
façade
storefront
signage
road
sidewalk
street furniture
vegetation
lighting
interaction
```

No visible central-area cell should remain obviously unfinished.

---

# NO EMPTY BACK SIDES

A common failure of generated urban environments is excellent façades facing the camera but empty geometry elsewhere.

Do not do that.

A user must be able to walk:

* around buildings
* behind the plaza
* onto side streets
* around corners

without immediately exposing unfinished geometry.

---

# LEVEL OF DETAIL

Use distance-dependent fidelity.

## NEAR

Full storefront detail.

## MID

Simplified façade geometry.

## FAR

Building massing and baked detail.

Use:

```text
THREE.LOD
InstancedMesh
shared geometry
texture atlases
```

as appropriate.

---

# PERFORMANCE TARGET

This is a dense environment but it must remain usable.

Target:

```text
1920×1080
modern desktop GPU
60 FPS preferred
45 FPS minimum sustained
```

Measure:

* draw calls
* triangles
* visible meshes
* texture memory
* JS frame time
* GPU frame time where available

Avoid optimizing merely by destroying scene fidelity.

---

# STREAMING

Divide the environment into spatial sectors.

Example:

```text
union-square-core
powell-north
powell-south
post-east
post-west
geary-east
geary-west
stockton
interiors-apple
interiors-nintendo
```

Load expensive assets based on distance.

Major landmark silhouettes may remain resident.

---

# PARALLEL PERFORMANCE AUDIT

Have a performance subagent inspect independently for:

* excessive materials
* duplicated geometry
* excessive textures
* overdraw
* expensive transparency
* too many shadow casters
* unnecessary animations
* expensive pedestrian updates

Fix measured bottlenecks.

Do not prematurely degrade visual quality.

---

# DEVELOPMENT MILESTONES

## MILESTONE 0 — RECONNAISSANCE

Before implementation:

* map area
* identify every building
* inventory visible stores
* collect references
* establish coordinate system

Use at least **8 parallel research/reconstruction agents**.

Do not proceed until the geographic inventory is coherent.

---

## MILESTONE 1 — GEO BLOCKOUT

Build:

* topography
* roads
* plaza
* building massing

Nothing else.

Render reference viewpoints.

Correct geometry until recognizable.

---

## MILESTONE 2 — ARCHITECTURE

Replace boxes with real building façades.

Use parallel agents by block.

---

## MILESTONE 3 — STREET-LEVEL STOREFRONTS

Reconstruct every visible ground-floor storefront.

Prioritize correctness over interiors.

---

## MILESTONE 4 — HERO BUILDINGS

Bring:

* Apple
* Nintendo
* Westin St. Francis
* Union Square plaza

to substantially higher detail.

---

## MILESTONE 5 — INTERIORS

Create accessible hero-store interiors.

---

## MILESTONE 6 — URBAN PROPS

Add:

* traffic infrastructure
* lamps
* signage
* furniture
* vegetation
* utilities
* road markings

---

## MILESTONE 7 — LIFE

Implement:

* pedestrians
* traffic
* store behavior
* ambient animation

---

## MILESTONE 8 — INTERACTIVITY

Implement:

* walk mode
* store interaction
* doors
* displays
* selectable businesses

---

## MILESTONE 9 — LIGHTING / MATERIAL POLISH

Perform dedicated technical-art pass.

---

## MILESTONE 10 — OPTIMIZATION

Profile and optimize.

---

## MILESTONE 11 — FINAL ADVERSARIAL QA

Have independent agents attempt to find:

* geographic errors
* visual errors
* interaction bugs
* performance problems
* unfinished viewpoints

Continue repairing until the QA threshold is met.

---

# SUBAGENT EXECUTION POLICY

Parallelism is mandatory.

At each milestone ask:

> Which tasks can proceed without waiting for another task?

Launch all of them concurrently.

For example, after GEO BLOCKOUT:

```text
Agent 1 → Apple façade
Agent 2 → Nintendo façade
Agent 3 → Westin
Agent 4 → Powell storefront census
Agent 5 → Stockton storefront census
Agent 6 → plaza props
Agent 7 → traffic assets
Agent 8 → pedestrians
Agent 9 → material library
Agent 10 → reference-camera QA
```

Do not wait for Agent 1 to finish before starting Agent 2.

The lead agent is an **orchestrator and integrator**, not the sole implementer.

---

# SUBAGENT TOKEN CONTROL

Give each subagent:

```text
scope
files allowed to modify
expected deliverable
verification method
maximum token budget
```

Prefer narrow, parallel jobs over enormous open-ended subagent sessions.

Terminate agents that wander outside scope.

---

# CROSS-AGENT REVIEW

Agents must not grade only their own work.

Use:

```text
Builder Agent
↓
Independent Reviewer
↓
Correction Agent
↓
Independent Re-review
```

for important components.

Apple and Nintendo require at least two independent visual review cycles.

---

# REQUIRED SELF-VERIFICATION LOOP

Every milestone must follow:

```text
IMPLEMENT
↓
RUN
↓
NAVIGATE THE REAL APPLICATION
↓
CAPTURE
↓
COMPARE
↓
MEASURE
↓
LIST ERRORS
↓
FIX
↓
RUN AGAIN
```

Repeat until convergence.

Never mark a milestone complete merely because:

* code compiles;
* assets load;
* no console error appears.

Those are minimum conditions, not quality verification.

---

# FINAL QA BAR

Before completion, independently score:

```text
Geographic accuracy
9/10 target

Building recognizability
9/10

Storefront accuracy
9/10

Apple reconstruction
9/10

Nintendo reconstruction
9/10

Street-level detail
8.5/10

Visual fidelity
8.5/10

Materials
8.5/10

Lighting
8.5/10

Pedestrian believability
8/10

Traffic believability
8/10

Interaction quality
8.5/10

Navigation
9/10

Performance
8.5/10

Completeness
9/10
```

No critical category may remain under **8/10**.

If it does, continue iterating.

Do not reduce the expected score to justify unfinished work.

---

# FINAL WALKTHROUGH TEST

Perform a real user walkthrough:

Start several blocks away.

Walk toward Union Square.

Confirm that the user can:

1. recognize the San Francisco streetscape;
2. see Union Square emerge naturally;
3. cross a functioning intersection;
4. walk through the plaza;
5. identify Dewey Monument;
6. see real surrounding storefronts;
7. locate Nintendo without a minimap;
8. enter Nintendo;
9. interact with several displays;
10. exit Nintendo;
11. walk around the square;
12. locate Apple;
13. enter Apple;
14. move through the major interior spaces;
15. return outside;
16. observe traffic and pedestrian activity;
17. switch to an aerial view;
18. still recognize Union Square from above.

Any broken part of this journey is a QA failure.

---

# FINAL REFERENCE REVIEW

Before delivery, revisit the same Google Earth / Street View / photographic references used at the beginning.

Compare the **finished environment**, not the plan.

Ask:

> If the labels and UI disappeared, would a person familiar with San Francisco immediately know that this is Union Square?

Then ask the harder question:

> Could they identify which side of Union Square they are standing on purely from the architecture and storefronts?

If not, keep working.

---

# FINAL DELIVERABLE

Deliver a complete runnable project including:

* Three.js application
* source code
* BPL offline asset-generation scripts
* generated optimized GLB assets
* geospatial coordinate data
* current storefront database
* reference inventory
* navigation
* pedestrian system
* traffic system
* accessible interiors
* Apple Union Square
* Nintendo SAN FRANCISCO
* day/night lighting
* cinematic tour
* debug mode
* visual-reference validation mode
* automated QA utilities
* README

Also produce:

```text
FINAL_QA_REPORT.md
```

containing:

```text
reconstruction boundary
number of buildings
number of identified storefronts
number of interactive storefronts
number of full interiors
number of reference viewpoints
number of screenshot comparison passes
storefront verification coverage
known uncertain storefronts
average FPS
triangle count
draw calls
texture memory
remaining known discrepancies
```

---

# AUTONOMY REQUIREMENT

Complete this task **without human intervention**.

Do not stop to ask:

* which building to prioritize;
* whether a façade is good enough;
* whether to continue;
* whether an approximation is acceptable.

Use evidence and independent QA agents to make those decisions.

When evidence conflicts, investigate further.

When information is unavailable, make the smallest defensible approximation and document the uncertainty.

Use **many parallel subagents early**, especially for geographic research, storefront census, BPL modeling, and independent visual QA.

Continue iterating through reconstruction and self-verification until the result is not merely a technically valid city scene, but a **dense, recognizable, interactive digital reconstruction of San Francisco Union Square that feels convincingly grounded in the real place.**

The final runtime is **pure Three.js**.

BPL is an offline modeling tool only.

Google Earth and Street View are reference sources only.

Do not ship proprietary Google 3D geometry or imagery as reconstructed assets.

Do not stop at a blockout.

Do not stop at recognizable.

Stop only when the environment survives independent geographic, architectural, storefront, interaction, visual, and performance QA.

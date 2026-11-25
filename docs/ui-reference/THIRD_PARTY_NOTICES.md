# Third party notices

Keep this file and the referenced license files when redistributing the project. These terms apply to the specified third party materials, independently of any license chosen for original ORBIT code.

## BodyParts3D anatomy

**BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.**

- Files: `dist/models/atlas.json` and `dist/models/body-0.bin` through `body-14.bin`; derived indexing and mappings appear in `catalog.json` and `bones-206.csv`.
- Source: BodyParts3D 4.0, adult male reference anatomy; the atlas and packed geometry were supplied for the project.
- [Official license page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), updated February 27, 2025.
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); full legal text is included in `licenses/CC-BY-4.0.txt`.
- Additional attribution and processing details: `dist/models/ATTRIBUTION.txt`.

The supplied manifest records prior meshoptimizer simplification, axis and unit conversion, and quantized normals. ORBIT preserves the supplied vertex positions and adds catalog mappings, display layers, colors, and condition annotations. The model is a generic reference rather than an individual medical scan. No proprietary Anatomage assets are included.

## Three.js

- Files: `dist/vendor/three.module.min.js` and `dist/vendor/OrbitControls.js`.
- [Project](https://github.com/mrdoob/three.js), version 0.170.0.
- MIT License; full notice is retained in `dist/vendor/THREE-LICENSE.txt`.

## Fonts

The bundled TTF files in `dist/assets/` contain Public Sans and IBM Plex Mono, served by `dist/assets/fonts.css`.

| Font | Source | License file |
| --- | --- | --- |
| Public Sans | [Google Fonts distribution](https://github.com/google/fonts/tree/main/ofl/publicsans) | `licenses/PublicSans-OFL.txt` |
| IBM Plex Mono | [Google Fonts distribution](https://github.com/google/fonts/tree/main/ofl/ibmplexmono) | `licenses/IBMPlexMono-OFL.txt` |

Both font families are distributed under the SIL Open Font License 1.1. Font files are bundled without modification.

## NASA imagery and educational references

- `dist/assets/earth-orbit.png`: Earth and aurora imagery credited to NASA / International Space Station; downloaded from [NASA's image asset](https://www.nasa.gov/wp-content/uploads/2021/02/radiation.png).
- Spaceflight health context: [NASA, The Human Body in Space](https://www.nasa.gov/humans-in-space/the-human-body-in-space/).
- [NASA imagery and media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).

NASA names, imagery, and identifiers do not imply endorsement of ORBIT. The ORBIT name and mark are separate project branding.

## Anatomy inventory references

Catalog source links point to OpenStax *Anatomy and Physiology 2e*, including the skeletal divisions, skull, limb bones, and heart anatomy chapters. The catalog uses anatomical names and factual mappings; it does not include chapter text or illustrations.

## ElevenLabs client SDK

`ui/vendor/elevenlabs-client.js` (copied to `dist/vendor/` by the build) bundles `@elevenlabs/client` 1.32.1 and its browser dependencies. Full available notices and license texts are retained in `ui/vendor/ELEVENLABS-NOTICES.txt`, including ElevenLabs, LiveKit, protobuf, and browser support libraries. The original SDK package is MIT licensed; individual bundled dependencies retain their listed licenses. The bundle was built in the original NASA-TEST project; its bundling script (`scripts/bundle-voice.mjs`) and package declarations were not carried over into this repository.

## Virtual space doctor avatar

The head and shoulders in blue scrubs derive from `White_M_1_Medi.glb` in [c-frame/valid-avatars-glb](https://github.com/c-frame/valid-avatars-glb), part of the VALID avatar collection. Copyright (c) 2022 Tiffany Do, MIT License. Full source provenance, hash, the retained license, and adaptation details are in `ui/models/doctor/`.

The matching Three.js r170 GLTFLoader and BufferGeometryUtils retain Three.js' MIT license in `dist/vendor/THREE-LICENSE.txt`. ORBIT's procedural flight-medical collar, earpiece, motion controller, and software 3D rendering changes form part of its original application code.

## Added anatomy geometry

Z-Anatomy additions use CC BY-SA 4.0. See dist/models/ANATOMY_SOURCES.md and the retained source license and contributor notices for exclusions and adaptation details.


## NASA Human Research Program and Canadian Space Agency pages

`dist/hrp-reference.js` and `data/nasa-hrp.json` hold text from NASA's
5 Hazards of Human Spaceflight (https://www.nasa.gov/hrp/hazards/) and its
five hazard pages, Risks of Human Spaceflight (https://www.nasa.gov/hrp/risks/)
and its 17 risk pages, and Ongoing HRP Research in Space
(https://www.nasa.gov/hrp/ongoing-hrp-research/) and its study pages,
retrieved 2026-11-13 with scripts/fetch-hrp.mjs. NASA text is a U.S.
Government work; images are not copied.

They also hold text from the Canadian Space Agency's Canadian experiments on
the Station (https://www.asc-csa.gc.ca/eng/iss/science/experiments.asp), its
11 current experiment pages, and the text version of its "How does space
affect the human body?" infographic
(https://www.asc-csa.gc.ca/eng/multimedia/search/image/8056).
© Canadian Space Agency. Reproduced for non-commercial educational use as the
CSA's terms allow (https://www.asc-csa.gc.ca/eng/terms.asp#copyright-reproduce);
commercial reproduction requires the CSA's prior written permission. No CSA
logo or Government of Canada symbol is used. The two CSA articles listed in the
challenge resources are summarised in our own words with links.

No endorsement by NASA or the CSA is claimed.

## MedlinePlus health-topic summaries

Source: MedlinePlus, National Library of Medicine. The bundled reference
retains 1,017 English health-topic summaries and metadata from the official
2026-10-31 XML dataset. These public-domain topic summaries are reused with
attribution. Licensed encyclopedia articles, linked external content, drug
monographs, images and logos are excluded. No endorsement is claimed.
See docs/CONDITION_SOURCES.md and https://medlineplus.gov/about/using/usingcontent/.


## Added in ORBIT 1.16

The female portrait derives from the MIT-licensed VALID `White_F_1_Medi.glb` character. Copyright (c) 2022 Tiffany Do. See `dist/models/doctor/ATTRIBUTION.md` and `VALID-LICENSE.txt`.

The bundled browser passkey client comes from `@simplewebauthn/browser`, under the MIT License. Its full license is included in `dist/vendor/WEBAUTHN-LICENSE.txt`. Server dependencies `@simplewebauthn/server`, `@aws-sdk/client-s3`, and `snowflake-sdk` install through npm with their own license notices. Package versions and transitive dependencies appear in package-lock.json.

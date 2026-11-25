# ORBIT anatomy sources

## Original reference atlas

BodyParts3D 4.0, © The Database Center for Life Science (DBCLS),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
[Official credit and current license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html).
The original 2,234-part atlas and its fifteen binary chunks are retained unchanged.
See ATTRIBUTION.txt for the supplied atlas's previous simplification and conversion.

## Added source geometry

1,003 mesh parts are adapted from [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy),
via the [3d-anatomy GLB export](https://github.com/nqwrc/3d-anatomy/tree/master/public/models).

Attribution required by the upstream collection:

- BodyParts3D, The Database Center for Life Science, CC BY-SA 2.1 Japan.
- Z-Anatomy, the open source atlas of anatomy, Gauthier Kervyn and Marcin Zielinski, CC BY-SA 4.0.
- Brainder and White matter, University of Washington.
- Cranial Nerves and Foramina, University of Dundee, CAHID, CC BY 4.0.

The adapted expanded-atlas.json and expanded-*.bin files are distributed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
The original upstream notices are preserved in Z-ANATOMY-LICENSE.txt and
Z-ANATOMY-CREDITS.md. This asset license does not license the entire application.

ORBIT decoded the nervous, lymphatic, muscular, and skeletal exports, baked scene
transforms, aligned the added geometry approximately to the original atlas,
simplified selected surfaces, quantized normals, and packed indexed triangles into
twelve binary chunks. Exact duplicate names were excluded. Muscle subparts may
overlap whole muscles from the original source. Source SHA-256 hashes are recorded
in expanded-atlas.json. scripts/expand-anatomy.mjs documents the conversion.

The upstream inner-ear and kidney models have noncommercial terms. Those source
components were excluded; no exported kidney geometry was imported. The skeletal
import includes only the coccyx. Original ORBIT schematic geometry provides ear,
ossicle, nephron, and other teaching views instead.

## Original schematic geometry and study index

The eighteen procedural modules in anatomy-details.js were authored for ORBIT.
They illustrate qualitative relationships and cell shapes. They are not to scale,
validated segmentations, microscopic images, measured flow, or patient anatomy.
Named concepts without source meshes use visibly labeled schematic geometry.
Some anatomical landmarks are concept markers on a teaching sample rather than
separately segmented surfaces. Source-linked structures can be opened in the atlas.

The study index organizes the requested list into 21 collections and 93 topics,
with 969 named references. References may share or link multiple source parts;
969 does not mean 969 independent validated anatomical meshes. It includes all
206 canonical bone names, 32 adult tooth names, and 31 spinal nerve pair names.
200 canonical bones have source links; the six ossicles use schematic geometry.

[OpenStax Anatomy and Physiology 2e](https://openstax.org/details/books/anatomy-and-physiology-2e)
informed standard terminology and educational organization. No textbook figures or
upstream Wikipedia definitions are copied into the application.

The generic adult male atlas and female regional teaching model are separate
references. No patient-specific disease, pregnancy, fetal scan, microscopic
resolution, muscle attachment validation, or clinical diagnostic accuracy is claimed.

# ORBIT virtual space doctor

The avatar is a generic fictional 3D character used as ORBIT's interface. It is not a real physician, an astronaut's medical scan, or a diagnostic model.

## Character source

`White_M_1_Medi.glb` from the VALID avatar collection, distributed at https://github.com/c-frame/valid-avatars-glb. Source asset: https://github.com/c-frame/valid-avatars-glb/blob/main/avatars/White/White_M_1_Medi.glb

Copyright (c) 2022 Tiffany Do. MIT License. The complete notice is retained in `VALID-LICENSE.txt`. The source catalog describes this character as a white male in medical clothing.

ORBIT presents the source as a head and shoulders portrait in its original blue scrubs, lowers the T-pose arms into a relaxed pose, removes the lower body, and simplifies geometry while retaining the source facial, eye, dental, and tongue shapes. Both arms and their shared skinning rig remain for idle gestures. The right fingers form a loose closed fist with its pinky edge facing the viewer during a yawn. The left hand retains a slight natural finger curl for checking a wristwatch. Embedded texture images are copied byte-for-byte. The communications earpiece and wristwatch are original procedural ORBIT geometry. Separate eye meshes support restrained gaze shifts.

Source GLB SHA-256: `042795c3b91e8036a31ec392ce798b49a7ea65f704a7957ed524bc7ef7904942`

The rebuild script (`scripts/prepare-doctor-avatar.mjs`) was not carried over into this repository, so the model cannot currently be rebuilt from source here. The full upstream body is not included in this project. Three.js and GLTFLoader are version 0.170.0 under the retained Three.js MIT license.

## Motion

Short PCM16 playback samples from the pinned ElevenLabs 1.32.1 WebRTC client drive a single critically damped jaw controller. Only a scalar level is kept, and missing frames expire after 45 ms instead of holding the mouth open. The jaw settles to less than one percent opening within 100 ms of a silent target in the regression check. Spectral data remains a fallback before the first valid playback sample. Spectral balance blends rounded and wider lip shapes; falling energy introduces light lip compression. Small dental and tongue deformations, cheek movement, asymmetric brow accents, blinks, gaze shifts, and head motion accompany the mouth. These are approximate audio-reactive expressions, not phoneme-aligned lip synchronization or inferred emotion. The ElevenLabs WebRTC connection does not provide the SDK's timed audio-alignment playback callback.

Text mode does not invent speech. Preview motion is a labeled local demonstration of individual syllables, complete mouth closures, and a phrase pause, with no audio or conversation. An occasional watch check raises the left wrist and directs the eyes and head toward its watch. It runs separately from the yawn and stops when the doctor listens or speaks. A separate local idle yawn raises the source character's right forearm and fist over the mouth before opening the jaw, then closes the mouth before lowering the arm. It begins after an irregular idle wait and has a longer cooldown between repetitions. Listening, connecting, or speaking smoothly cancels it. Preview yawn and Check watch demonstrate these gestures without starting a conversation. Hiding the panel or document suspends animation and resets speech and the arm pose. The motion toggle and system reduced-motion preference are supported.

WebGL is preferred; the software renderer projects and texture-maps the same 3D geometry, morphs, and skinned arms when WebGL is unavailable. No avatar service, extra API key, camera feed, or visitor face analysis is used.


### Relaxed portrait pose, version 1.9.1

The portrait now lowers the clavicles by about three degrees and brings the
upper arms closer to the torso before baking the source rig. Head scale, skin
textures, facial shapes, and blue scrubs remain from the same source character.
Shoulder movement rotates around the clavicle rather than adding a constant
upward translation. Small signed movements settle over about 0.6 seconds, with
no sustained raised-shoulder bias during speech.

The original ORBIT headset now uses an ear pad and curved ear hook fitted over the right ear. Its thinner microphone boom ends beside the mouth. It shares the avatar’s neck pivot and head rotation.


## Female character added in 1.16

`space-doctor-female.glb` derives from `White_F_1_Medi.glb` in the same MIT-licensed VALID collection: https://github.com/c-frame/valid-avatars-glb/blob/main/avatars/White/White_F_1_Medi.glb. Copyright (c) 2022 Tiffany Do. The source includes the female face, eyes and brown hair geometry. ORBIT applies the same portrait extraction, retained facial shapes, arm skeleton, and procedural headset/watch. A runtime material colors the scrubs pink. Embedded source texture images remain unchanged. The hair follows the head pivot. This is a fictional virtual interface character.

It was built with the same `scripts/prepare-doctor-avatar.mjs`, which is not in this repository.

## Studio material update in 1.17

The original embedded base-colour and normal atlas images remain unchanged. Runtime `doctor-materials.js` adds separate physically based responses for skin, cloth, eyes, hair and enamel, plus a generated local pore microdetail texture. Studio lighting and reflections are built locally in Three.js. Equipment finishes and software texture sampling are refined. These additions do not replace the licensed source geometry or expression shapes. The generation provenance and rendering limits were described in a `docs/AVATAR_STUDIO_UPGRADE.md` that was not carried over into this repository.

## Open-stage avatar refinement (1.18)

`doctor-appearance.mjs` adds original procedural swept hair geometry to the male portrait and a smooth geometric refinement to the female face and its expression endpoints. Source UVs, embedded images and articulated arms are retained. The avatar uses alpha transparency in WebGL and the software renderer.

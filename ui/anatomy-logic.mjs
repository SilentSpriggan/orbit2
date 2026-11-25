export function cacheUntilFailure(load){
 let pending=null;
 return ()=>pending??=load().catch(error=>{pending=null;throw error;});
}
export function leftForearmBoneIds(catalog){
 return new Set(catalog.bones.filter(b=>b.side==='Left'&&b.region==='upper'&&['Arm and forearm','Carpals','Metacarpals','Hand phalanges'].includes(b.group)&&b.name!=='Left humerus').flatMap(b=>b.meshIds));
}

export const skeletalLayers = ['skeleton', 'cartilage', 'dental'];
const organLayers = new Set(['heart', 'arteries', 'veins', 'nervous', 'respiratory', 'digestive', 'urinary', 'reproductive', 'endocrine', 'lymphatic', 'sensory']);
export const hasOrganLayers = layers => Object.entries(layers).some(([id, visible]) => visible && organLayers.has(id));
export function withSkeletonContext(ids) {
 const result = new Set(ids);
 if ([...result].some(id => organLayers.has(id))) skeletalLayers.forEach(id => result.add(id));
 return [...result];
}
export function isSkeletalContext(part, layers) {
 return skeletalLayers.includes(part.layer) && hasOrganLayers(layers);
}
export function structureIsVisible(part, {layers, hiddenIds, isolation, inRegion, conditionHiddenIds}) {
 if (hiddenIds.has(part.id) || conditionHiddenIds?.has(part.id)) return false;
 // The male urethral mesh extends into the external reproductive geometry.
 // Keep it with that explicit layer so general organ views have no floating remnant.
 if (part.id === 'FJ3148' && !layers.reproductive) return false;
 if (isSkeletalContext(part, layers)) return true;
 return !!layers[part.layer] && (!isolation || isolation.has(part.id)) && inRegion;
}

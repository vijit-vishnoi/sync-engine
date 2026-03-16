import type { Identifier } from "../types/crdt";

function comparePosition(pos1:Identifier[], pos2:Identifier[]):number{
    var minLength=Math.min(pos1.length,pos2.length)
    for (let i=0;i<minLength;i++){
        const id1=pos1[i]
		const id2=pos2[i]
        if(id1.digit<id2.digit) return -1;
        if (id1.digit>id2.digit){
			return 1
		}
		if (id1.siteId<id2.siteId){
			return -1
		} else if (id1.siteId>id2.siteId){
			return 1
		}
    }
    if (pos1.length<pos2.length) {
		return -1
	} 
	if (pos1.length>pos2.length){
		return 1
	}
	return 0
}


export {
    comparePosition
}
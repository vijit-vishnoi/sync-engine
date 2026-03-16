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

function generatePositionBetween(pos1:Identifier[],pos2:Identifier[],siteId:string):Identifier[]{
    const newPos:Identifier[]=[];
    var level=0
	while(true){
		let id1:Identifier
		let id2:Identifier
		if (level<pos1.length){
			id1=pos1[level]
		} else{
			id1={digit: 0,siteId: siteId}
		}
		if (level <pos2.length){
			id2=pos2[level]
		}else{
			id2={digit: 100000,siteId: siteId}
		}
		if (id2.digit-id1.digit<=1){
			newPos.push(id1)
			level++
			continue
		}
		var newIdentifier={
			digit: id1.digit+1,
			siteId: siteId,
		}
		newPos.push(newIdentifier)
		return newPos
	}
}

export {
    comparePosition,
    generatePositionBetween
}
import { CRDTChar } from './../types/crdt';
import type { CRDTChar, Identifier } from "../types/crdt";


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

class CRDTEngine{
	siteId: string;
	document:CRDTChar[];

	constructor(siteId:string,initialDoc:CRDTChar[]=[]){
		this.siteId=siteId;
		this.document=initialDoc;
	}
	findIndex(char:CRDTChar):number{
		let left=0;
		let right=this.document.length;
		while(left<right){
			const mid=Math.floor(left+(right-left)/2);
			let res=comparePosition(this.document[mid].position,char.position);
			if(res==-1) left=mid+1;
			else right=mid;
		}
		return left;
	}
	remoteInsert(char:CRDTChar):number{
		let ind=this.findIndex(char);
		this.document.splice(ind,0,char);
		return ind;
	}
	remoteDelete(char:CRDTChar):number{
		let ind=this.findIndex(char);
		if(this.document[ind] && comparePosition(this.document[ind].position,char.position)==0){
			this.document.splice(ind,1)
			return ind;
		}
		else return -1;
	}
	localInsert(index:number,value:number):CRDTChar{
		const pos1=index-1>=0?this.document[index-1].position:[];
		const pos2=index<this.document.length?this.document[index].position:[];
		let newPos=generatePositionBetween(pos1,pos2,this.siteId);
		const newChar:CRDTChar={
			value:value,
			position:newPos
		};
		this.document.splice(index,0,newChar)
		return newChar
	}
}
export {
	comparePosition,
	generatePositionBetween,
	CRDTEngine
}
package crdt
import ("sort")
type Identifier struct{
	Digit int `json:"digit"`
	SiteId string `json:"siteId"`
}
type Char struct{
	Value rune `json:"value"`
	Position []Identifier `json:"position"`
}
type Document struct{
	Chars []Char `json:"chars"`
}
func (doc *Document) Insert(char Char){
	index :=sort.Search(len(doc.Chars),func(i int)bool{
		return ComparePosition(doc.Chars[i].Position,char.Position)>=0
	})
	if index<len(doc.Chars) && ComparePosition(doc.Chars[index].Position,char.Position)==0{
		return 
	} 
	doc.Chars=append(doc.Chars[:index],append([]Char{char},doc.Chars[index:]...)...)
}

func (doc *Document) Delete(char Char){
	index:=sort.Search(len(doc.Chars),func(i int) bool {
		return ComparePosition(doc.Chars[i].Position,char.Position)>=0
	})
	if index<len(doc.Chars)&& ComparePosition(doc.Chars[index].Position,char.Position)==0{
		doc.Chars=append(doc.Chars[:index],doc.Chars[index+1:]... )
	}
}

func GeneratePositionBetween(pos1,pos2 []Identifier,siteId string)[]Identifier{
	var newPos []Identifier
	level:=0
	for{
		var id1,id2 Identifier
		if level<len(pos1){
			id1=pos1[level]
		} else{
			id1=Identifier{Digit: 0,SiteId: siteId}
		}
		if level <len(pos2){
			id2=pos2[level]
		}else{
			id2=Identifier{Digit: 100000,SiteId: siteId}
		}
		if id2.Digit-id1.Digit<=1{
			newPos=append(newPos, id1)
			level++
			continue
		}
		newIdentifier:=Identifier{
			Digit: id1.Digit+1,
			SiteId: siteId,
		}
		newPos=append(newPos, newIdentifier)
		return newPos
	}
}

func ComparePosition(pos1,pos2 []Identifier)int{
	minLength:=min(len(pos1),len(pos2))
	for  i:=0;i<minLength;i++{
		id1:=pos1[i]
		id2:=pos2[i]
		if id1.Digit<id2.Digit{
			return -1
		} 
		if id1.Digit>id2.Digit{
			return 1
		}
		if id1.SiteId<id2.SiteId{
			return -1
		} else if id1.SiteId>id2.SiteId{
			return 1;
		}
	}
	if len(pos1)<len(pos2) {
		return -1
	} 
	if len(pos1)>len(pos2){
		return 1


	}
	return 0

}
export interface Identifier {
  digit: number;
  siteId: string;
}

export interface CRDTChar {
  value: number; 
  position: Identifier[];
}

export interface SyncMessage {
  type: 'init' | 'insert' | 'delete' |'cursor';
  char?: CRDTChar;
  fullDoc?: CRDTChar[];
  senderId?:string;
  lineNumber?:number;
  column?:number;
  displayName?:string;
}

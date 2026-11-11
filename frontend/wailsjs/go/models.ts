export namespace profile {
	
	export class Profile {
	    username: string;
	    displayName: string;
	
	    static createFrom(source: any = {}) {
	        return new Profile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.username = source["username"];
	        this.displayName = source["displayName"];
	    }
	}

}

export namespace recording {
	
	export class Recording {
	    path: string;
	    fileName: string;
	    sizeBytes: number;
	
	    static createFrom(source: any = {}) {
	        return new Recording(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.fileName = source["fileName"];
	        this.sizeBytes = source["sizeBytes"];
	    }
	}

}


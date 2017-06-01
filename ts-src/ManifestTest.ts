import {Manifest} from "./Manifest";

class ManifestTest {


    constructor(public testling : Manifest) {

       if(testling == null ) {
           throw new Error("testling may not be null");
       }
    }

    public testGetResolutions() {
        this.testling.getAvailableResolutions();
    }
}
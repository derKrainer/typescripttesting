import {XmlParser, XmlAttribute, XmlNode} from "./XmlParser";


/**
 * Class to parse a MPD Manifest XML and provide accessor methods for the relevant nodes
 */
export class Manifest {
    constructor(protected parsedXml : XmlParser, public videoType : string = 'video/mp4', public audioType : string = 'video/mp4'){

    }

    public getParser() : XmlParser {
        return this.parsedXml;
    }

    public updateXml(xmlContent : string) : void{
        this.updateParsedXml(new XmlParser(xmlContent));
    }

    public updateParsedXml(parsedXml : XmlParser) : void {
        this.parsedXml = parsedXml;
    }

    public getAllVideoSegments() : XmlNode[] {
        return this.parsedXml.xPath('MPD/Period/AdaptationSet[@mimeType="' + this.videoType + '"]/Representation');
    }

    public getVideoSegmentForHeight(heightInPixels : string) {
        return this.parsedXml.xPath(`MPD/Period/AdaptationSet[@mimeType="${this.videoType}"]/Representation[@height="${heightInPixels}"]`);
    }

    public getVideoSegmentTemplate() : XmlNode {
        let allNodes : XmlNode[] = this.parsedXml.xPath('MPD/Period/AdaptationSet[@mimeType="' + this.videoType + '"]/SegmentTemplate');
        if(allNodes.length > 1) {
            throw new Error("Invalid Manifest, more than one Video Segment Template");
        } else {
            return allNodes[0];
        }
    }

    public getAvailableResolutions() : Resolution[] {
        let retVal : Resolution[] = [];

        let videoSegments = this.getAllVideoSegments();
        for(let i = 0; i < videoSegments.length; i++){
            retVal.push(new Resolution(videoSegments[i]));
        }

        //TODO: test this method

        return retVal;
    }

    public getAllAudioSegments() : XmlNode[] {
        return this.parsedXml.xPath('MPD/Period/AdaptationSet[@mimeType="' + this.audioType + '"]/Representation');
    }

}

export class Resolution {

    public height : number;
    public width : number;

    constructor(videoSegmentNode : XmlNode) {
        if(videoSegmentNode == null) {
            throw new Error('Cannot construct a Reolution from nothing');
        }

        this.width = Number.parseInt(videoSegmentNode.getAttribute('width').value);
        this.height = Number.parseInt(videoSegmentNode.getAttribute('height').value);
    }
}
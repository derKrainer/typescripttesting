import { XmlParser, XmlNode, XmlAttribute } from './XmlParser';
import {Manifest} from "./Manifest";


export class MseDemo {

    /**
     * Manifest accessor for video and audio info
     */
    protected manifest: Manifest = null;
    protected videoMediaSource: MediaSource;
    protected videoSourceBuffer: SourceBuffer;

    /**
     * maximum number of chunks for the current representation
     */
    public numberOfChunks = 52; //TODO: read from manifest, but from wherE?

    constructor(public manifestUrl: string, public representationId: string, public videoElement: HTMLVideoElement) {
        this.performGETText(this.manifestUrl)
            .then((xmlContent) => {
                this.updateManifest(xmlContent);
                console.log("Successfully set up Parser from " + manifestUrl);
                this.videoMediaSource = new MediaSource();
                this.videoElement.src = window.URL.createObjectURL(this.videoMediaSource);
                this.videoMediaSource.addEventListener('sourceopen', (event) => this.onMediaSourceOpen(event));
            })
            .catch((err) => {
                console.error("Error during setup of Parser from url: '" + manifestUrl + "' error: " + err.message)
                throw err;
            });
    }

    /**
     * Initializes the videoSourceBuffer, adds the eventListener for the continuous loading of segments and
     * starts the video playback
     * 
     * @param event the event which triggered the call of this method (not used in default impl)
     */
    protected onMediaSourceOpen(event: Event): void {
        //TODO: read type from manifest
        this.videoSourceBuffer = this.videoMediaSource.addSourceBuffer('video/mp4; codecs="avc1.4d401f');
        this.videoSourceBuffer.addEventListener('updateend', (event) => { this.readNextSegment(event) });
        this.performGETArrayBuffer(this.getInitUrl())
            .then(initbuffer => {
                this.videoSourceBuffer.appendBuffer(new Uint8Array(initbuffer));
                this.videoElement.play();
            })
            .catch(err => {
                console.error('Error during initialisation: ' + err);
            });
    }

    /**
     * Retrieves the init (0-segment of video) url for the video in the current representation
     * from the manifest file
     */
    protected getInitUrl(): string {

        let templateNode = this.manifest.getVideoSegmentTemplate();
        let initUrl = templateNode.getAttribute('initialization') == null ? null : templateNode.getAttribute('initialization').value;

        if (initUrl == null) {
            throw Error('Could not find template url in Video Segment Template');
        }

        if (!initUrl.startsWith('http')) {
            // relative path
            let manifestRoot = this.manifestUrl.substring(0, this.manifestUrl.lastIndexOf('/') + 1);
            initUrl = manifestRoot + initUrl;
        }

        initUrl = initUrl.replace('$RepresentationID$', this.representationId);

        return initUrl;
    }

    /**
     * Retrieves the media Url from the manifest xml and perfroms replacements for the
     * current representationId ($RepresentationID$) and segmentNumber ($Number$)
     * 
     * @param segmentNumber the number of the segment to replace the $Number$ placeholder
     */
    protected getMediaUrl(segmentNumber: number): string {
        let templateNode = this.manifest.getVideoSegmentTemplate();
        let mediaUrl = templateNode.getAttribute('media') == null ? null : templateNode.getAttribute('media').value;

        if (mediaUrl == null) {
            throw Error('Could not find media url in Video Segment Template');
        }

        if (!mediaUrl.startsWith('http')) {
            // relative path: cut ending from manifest url (up to last /) and append the relative path
            let manifestRoot = this.manifestUrl.substring(0, this.manifestUrl.lastIndexOf('/') + 1);
            mediaUrl = manifestRoot + mediaUrl;
        }

        mediaUrl = mediaUrl.replace('$RepresentationID$', this.representationId);
        mediaUrl = mediaUrl.replace('$Number$', '' + segmentNumber);

        return mediaUrl;
    }

    protected currentSegmentNumber = 1;


    /**
     * Reads the next segment (depending on this.currentSegmentNumber) and appends the result
     * to the this.videoSourceBuffer
     * 
     * @param event the event triggerin this call (not handled in any way in default impl)
     */
    protected readNextSegment(event: Event): void {
        this.performGETArrayBuffer(this.getMediaUrl(this.currentSegmentNumber++))
            .then(videoBuffer => {
                this.videoSourceBuffer.appendBuffer(new Uint8Array(videoBuffer));
            })
            .catch(err => {
                this.videoSourceBuffer.removeEventListener('updateend', (event) => { this.readNextSegment(event) });
                console.log('Error during initialisation: ' + err);
            });
        if (this.currentSegmentNumber >= this.numberOfChunks) {
            this.videoSourceBuffer.removeEventListener('updateend', (event) => { this.readNextSegment(event) });
        }
    }

    /**
     * Updates the underlying manifest file
     * 
     * @param xmlContent the xml string representing the manifest file
     */
    protected updateManifest(xmlContent: string): void {
        if (this.manifest == null) {
            this.manifest = new Manifest(new XmlParser(xmlContent));
        }
        else {
            this.manifest.updateXml(xmlContent);
        }
        console.log("Updated manifest content to: " + this.manifest.getParser().rootNode.printContent());
    }

    /**
     * Performs a HTTP GET request which has the response type text
     * @param url the url to be gotten
     */
    public performGETText(url: string): Promise<string> {
        return this.performGET(url, 'text');
    }

    /**
     * Performs a HTTP GET request which has the response type arraybuffer
     * @param url the url to be gotten
     */
    public performGETArrayBuffer(url: string): Promise<ArrayBuffer> {
        return this.performGET(url, 'arraybuffer');
    }

    /**
     * Performs a XmlHttpRequest wrapped in a promise with the given response type
     * @param url the url from which to get the content
     * @param responseType the type of data behind the url
     */
    protected performGET(url: string, responseType: XMLHttpRequestResponseType): Promise<any> {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.responseType = responseType;
            xhr.onload = function (e) {
                if (xhr.status == 200) {
                    resolve(xhr.response);
                }
                else {
                    reject('Unexpected XHR Status: ' + xhr.status + ". Repsonse: " + xhr.response);
                }
            };
            xhr.onerror = function (err) {
                reject(err);
            };
            try {
                xhr.send();
            }
            catch(err) {
                reject(err);
            }
        });
    }

}

window.onload = function () {
    let videoElement = <HTMLVideoElement>document.querySelector("video");

    if (videoElement == null) {
        throw new Error("No Video Element found");
    }

    //TODO: make representation id configurable / selectable
    let mse = new MseDemo('https://bitdash-a.akamaihd.net/content/MI201109210084_1/mpds/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.mpd', '720_2400000', videoElement)


}
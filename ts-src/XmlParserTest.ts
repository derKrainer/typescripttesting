import {XmlParser, XmlNode} from './XmlParser';
import {Manifest} from './Manifest';

var parser : XmlParser = null;
var manifest : Manifest = null;

window.onload = function() {
    let inputXML = document.getElementById("xmlInput");
    inputXML.onkeyup = updateOutput;

    let inputSearch = document.getElementById('xpath_in');
    inputSearch.onkeyup = searchXml;

    updateOutput();
}

function updateOutput (){
    var textArea : HTMLTextAreaElement = <HTMLTextAreaElement> document.getElementById('xmlInput');
    if(parser == null) {
        parser = new XmlParser(textArea.value);
    } else {
        parser.parseXml(textArea.value);
    }
    // var newContent = parser.rootNode.printContent();
    let newContent = '';
    parser.rootNode.getAllNodes().forEach((element, index) => {
        newContent += 'Node number: ' + (index+1) + '; node content: ' + element.toOpenTagXml() + '\n';
    }); 

    if(parser != null) {
        if(manifest == null)
        {
            manifest = new Manifest(parser);
        }
        else {
            manifest.updateParsedXml(parser);
        }

        let manifestString = 'All Video Nodes:\n';
        manifest.getAllVideoSegments().forEach((element) => {
            manifestString += element.toOpenTagXml() + '\n';
        });

        manifestString += '\n\nHeightSelection for 1080:\n'
        manifest.getVideoSegmentForHeight('1080').forEach(element => {
            manifestString += element.toOpenTagXml() + '\n';
        });

        document.getElementById('videoNodes').innerText = manifestString;
    }
    

    document.getElementById('output').innerText = newContent;
}

function searchXml() {
    let searchInput = <HTMLInputElement> document.getElementById('xpath_in');
    let searchString = searchInput.value;
    let resultString = '';
    try {
        let results : XmlNode[] = parser.rootNode.getAllChildrenMatchingPath(searchString);

        results.forEach(res => {
            resultString += res.printContent() + '\n'; 
        });
    }
    catch(Error ) {
        resultString = 'An Error occured';
    }

    document.getElementById('search-result').innerText = resultString;

}

function manifestOutput() {

}

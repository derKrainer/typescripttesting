
/**
 * Class to handle parsing of XML Strings and convert them into "easy" accessible form
 */
export class XmlParser
{
    public rootNode : XmlNode;

    constructor(xmlContent : string) {
        this.parseXml(xmlContent);
    }

    /**
     * Parses the given xml string into a hierarchical structure where the root node will be set to this.rootNode
     * @param content the xmlContent to be parsed
     */
    parseXml(content : string ) : void {
        
        let xmlStart = -1;
        if( (xmlStart = content.indexOf('<?xml')) > -1) {
            let xmlEnd = content.indexOf('?>');
            if(xmlEnd < 0) {
                throw new Error('XmlDeclaration has no closing ?>');
            }
            xmlEnd += 2;

            superDetailedDebug('Removing xml declaration from: ' + xmlStart + " to: " + xmlEnd);
            content = content.substr(xmlEnd);
            superDetailedDebug('New content: ' + content);
        }

        content = this.removeComments(content);

        this.rootNode = new XmlNode(content, null);
    }

    /**
     * Removes all comments from  the xml string so they dont get in the way of parsing
     */
    protected removeComments(content : string) : string {

        let retVal = content;

        let commentStart = -1;
        while((commentStart = retVal.indexOf('<!--')) > -1) {
            let commentEnd = retVal.indexOf('-->')

            if(commentEnd == -1) {
                throw new Error('Comment starting at position ' + commentStart + ' has no end tag');
            }
            superDetailedDebug('removing comment: ' + retVal.substr(commentStart, (commentEnd - commentStart) + 3));

            retVal = retVal.substr(0, commentStart) + retVal.substr(commentEnd + 3);
        }

        return retVal;
    }

    public xPath(expression : string) : XmlNode[] {
        return this.rootNode == null ? null : this.rootNode.getAllChildrenMatchingPath(expression);
    }
}

/**
 * Class to represent the information from the xml-string in structured form
 */
export class XmlNode {

    // actual content
    attributes : XmlAttribute[] = [];
    name : string;
    value : string;
    childNodes : XmlNode[] = [];

    // parse infos
    nodeContent : string;
    childContent : string;
    public startingPosition : number;

    constructor(public xmlContent: string, public parent : XmlNode) {
        this.parseContent();
    }

    /**
     * Parses the xml content of the first node in the xmlContent including all child-nodes of the parsed node
     */
    protected parseContent() : void {
        let nodeFrom = this.xmlContent.indexOf('<');
        let nodeTo = this.xmlContent.indexOf('>', nodeFrom);

        if(nodeFrom > -1 && nodeTo > -1) {
            this.startingPosition = nodeFrom;
            this.nodeContent = this.xmlContent.substr(nodeFrom + 1, (nodeTo - nodeFrom - 1));
            superDetailedDebug(`NodeContent: ${this.nodeContent}`);

            if(this.nodeContent.charAt(this.nodeContent.length -1 ) == '/') {
               superDetailedDebug('Found end tag at the end of node')
                this.xmlContent = this.xmlContent.substr(0, nodeTo + 1);
                superDetailedDebug('Updated xmlContent to: ' + this.xmlContent);

                this.nodeContent = this.nodeContent.substr(0, this.nodeContent.length -1);
                this.parseNodeContent();
            }
            else {
                this.parseNodeContent();

                let endTag = '</' + this.name + '>';
                let endIndex = this.xmlContent.indexOf(endTag, nodeTo);

                if(endIndex < 0) {
                    throw new Error('No end tag found for: ' + this.name);
                }

                this.xmlContent = this.xmlContent.substr(0, endIndex + endTag.length + 1);
                superDetailedDebug('updating xmlContent to: ' + this.xmlContent);
                
                this.childContent = this.xmlContent.substring(nodeTo + 1, endIndex);
                superDetailedDebug('ChildContent: ' + this.childContent);

                // more than one node on the same level possible, so parse one element and substract its
                // content length from the remaining childContent
                var childContentToParse = this.childContent;

                // while(childContentToParse.length > 3) { // length 3 would be </>
                while(childContentToParse.indexOf('<') > -1) { // as long as there is a child tag

                    superDetailedDebug('remaining childContent: ' + childContentToParse);

                    let child = new XmlNode(childContentToParse, this);

                    // TODO: improve this attempt at letting the value beeing anywhere, not just at the end of the content
                    // childContentToParse = childContentToParse.substr(0, child.startingPosition - 1) + childContentToParse.substr(child.startingPosition + child.xmlContent.length);
                    // childContentToParse = childContentToParse.trim();

                    // TODO: remove this alternative when the value at any position is working
                    childContentToParse = childContentToParse.substr(child.xmlContent.length);

                    this.childNodes.push(child);
                }

                // the rest is the value
                this.value = childContentToParse.trim();

            }

        }
        else {
            error("Unableo to find node content for " + this.xmlContent);
        }
    }

    /**
     * Parses the content of the node xml (name + all attributes inside the tag)
     */
    protected parseNodeContent() : void {
        if(this.nodeContent == null || this.nodeContent.length < 1) {
            throw new Error('there is no nodeContent to parse!');
        }
        
        let allAttributes = this.nodeContent.split(' ');
        this.name = allAttributes[0];

        superDetailedDebug("Parsing content of node with name: " + this.name);

        let attrString = '';
        for(let i = 1; i < allAttributes.length; i++) {
            attrString = allAttributes[i];

            if(attrString.length > 0 && attrString.indexOf('=') > -1) {
                let attr = attrString.split('=');
                let val = attr[1].trim();
                if(val.charAt(0) == '"'){
                    val = val.substr(1);
                }
                if(val.charAt(val.length-1) == '"'){
                    val = val.substr(0, val.length - 1);
                }
                this.attributes.push(new XmlAttribute(attr[0], val));

                superDetailedDebug("Parsed: " + this.attributes[this.attributes.length - 1].toString());
            }
            else if(allAttributes[i -1].charAt(allAttributes[i-1].length - 1) != '"') {
                // dirty way to concatenate split strings again
                let toAppend = attrString.charAt(attrString.length -1) == '"' ? attrString.substr(0, attrString.length - 1) : attrString;
                this.attributes[this.attributes.length - 1].value += ' ' + toAppend;
            } else {
                error('Unparsable attribute: ' + attrString);
            }
        }
    }

    /**
     * formats the xml content into a printable text (non-html) version
     * @param indent prefix for each line
     */
    public printContent(indent : string = "") : string {

        let retVal = indent + `<${this.name} `;
        this.attributes.forEach(element => {
            retVal += element.toString();
        });
        if(this.value != null && this.value != ""){
            retVal += `value="${this.value}"`
        }
        retVal += '>';
        this.childNodes.forEach(element => {
            retVal += '\n' + element.printContent(indent + '  ');
        });

        retVal += '</' + this.name + '>';

        return retVal;
    }

    public toOpenTagXml() : string {
        let retVal = `<${this.name} `;

        this.attributes.forEach(element => {
            retVal += `${element.name}="${element.value}" `
        });

        retVal += ">";

        return retVal;
    }

    public toCloseTagXml() : string {
        return `</${this.name}>`;
    }

    /**
     * retrieves a list of nodes matching a given set of expressions concatenated by /
     * The expressions are to be digested by the function matchesExpression in this class.
     * If the expression starts with // all nodes will be considered as the start node instead of the root node
     * 
     * @param requestPath the path to the desired node in the form of rootNode/expression/expression. The expressions must match the acceppted input of the method matchesExpression 
     */
    public getAllChildrenMatchingPath(requestPath : string) : XmlNode[] {
        if(requestPath == null || requestPath == "") {
            throw new Error('Invalid path: ' + requestPath);
        }
        let retVal : XmlNode[] = [];

        let workingNodes : XmlNode[] = [this];

        let iterationStart = 1;
        // if request path starts with // take all nodes as root nodes for the rest of the expression
        if(requestPath.indexOf('//') == 0){
            workingNodes = this.getAllNodes();
            requestPath = requestPath.substr(2); // remove leading // and continue working
            iterationStart = 0;
        }

        // use special split as the test case for the manifest includes [@mimeType="video/mp4"] which would have been split after video
        let allParts = this.stringAwareSplit(requestPath, '/');

        //TODO: maybe skip this step
        if(iterationStart == 1 && !this.matchesExpression(allParts[0])){
            return retVal;
        }

        for(let i = iterationStart; i < allParts.length; i++) {

            // clear at the start of each level
            retVal = [];

            workingNodes.forEach(node => {
                node.childNodes.forEach(child => {
                    if(child.matchesExpression(allParts[i])){
                        retVal.push(child);
                    }
                });
            });

            // save in working nodes for next iteration
            workingNodes = retVal;
        }

        return retVal;
    }

    /**
     * Checks if this node matches the requirements of the given expression. Currently the following options are supported:
     * - name
     * - name[@attributeName="attributeValue"]
     * - * (matches Name)
     * - *[@attributeNama="attributeValue"] (matches all names and the given attribute value)
     * 
     * @param expression the expression to be checked for matching this
     */
    protected matchesExpression(expression : string ) {
        if(expression == null || expression == "") {
            throw new Error('Invalid expression: ' + expression);
        }

        let retVal = false;

        let nameSelector = expression;
        let expStart = -1;
        if( (expStart = expression.indexOf('[@')) > -1) {
            nameSelector = expression.substr(0, expStart);
        }

        if(nameSelector == '*') {
            retVal = true;
        }
        else if(this.name == nameSelector) {
            retVal = true;
        }
        
        if( retVal && expStart > -1) {

            retVal = false;

            // search for attribute
            let expEnd = expression.indexOf(']', expStart);
            if(expEnd == -1) {
                throw new Error('Attribute selector has no closing bracket: ' + expression.substr(expStart));
            }

            let attributeSelector = expression.substring(expStart, expEnd).split('=');
            if(attributeSelector.length == 1) {
                throw new Error('Invalid attribute selector: ' + attributeSelector[0] + '. Expected [@attrName="attrValue"]');
            }
            let attName = attributeSelector[0].substr(2); // remove [@
            let attVal = attributeSelector[1];
            if(attVal.charAt(0) == '"'){
                attVal = attVal.substr(1);
            }
            if(attVal.charAt(attVal.length -1 ) == '"') {
                attVal = attVal.substring(0, attVal.length -1);
            }
            
            this.attributes.forEach(attribute => {
                if(attribute.name == attName && attribute.value == attVal) {
                    retVal = true;
                }
            });
        }


        return retVal;
    }

    /**
     * Retrieves a list of all nodes descending from this node including this node
     * 
     * @param maxDepth the maximum number of levels this method should decend into before stopping (if greater/equal the max depth of the node this will have no effect)
     */
    public getAllNodes(maxDepth : number = -1) : XmlNode[] {
        let retVal : XmlNode[] = [];

        let workingCopy : XmlNode[] = [this];
        let nextWorkingCopy : XmlNode[] =  [];

        let hasAdded = true;
        while(hasAdded == true && maxDepth != 0) {
            hasAdded = false;
            workingCopy.forEach(element => {
                retVal.push(element);
                element.childNodes.forEach(child => {
                    nextWorkingCopy.push(child);
                });
                hasAdded = true;
            });

            workingCopy = nextWorkingCopy;
            nextWorkingCopy = [];
            maxDepth --;
        }

        return retVal;
    }

    /**
     * Spits a string while ignoring seperators between "
     * @param toSplit the string to be split
     * @param seperator the string to split at
     * @return all parts to toSplit which were seperated by the seperator outside of ""
     */
    public stringAwareSplit(toSplit : string, seperator : string) : string[] {
        let retVal : string[] = [];

        let insideString = false;
        for(let i = 0; i < toSplit.length; i++){
            if(toSplit.charAt(i) == '"') {
                insideString = insideString ? false : true;
            }
            else if(!insideString && toSplit.substr(i, seperator.length) == seperator) {
                retVal.push(toSplit.substring(0, i));
                toSplit = toSplit.substr(i + seperator.length);
                i = 0;
            }
        }
        if(toSplit != null && toSplit.trim().length > 0){
           retVal.push(toSplit.trim());
        }

        return retVal;
    }

    /**
     * Searches this elements attributes for the first matching the attribute name
     * 
     * @param attributeName the name of the searched attribute
     */
    public getAttribute(attributeName : string) : XmlAttribute {
        for(let i = 0; i < this.attributes.length; i++) {
            if(this.attributes[i].name == attributeName){
                return this.attributes[i];
            }
        }
        debug('Could not find attribute: "' + attributeName + '" on Node: ' + this.name);
        return null;
    }

}

/**
 * Class to represent a XML attribute with a value
 */
export class XmlAttribute {
    constructor(public name : string, public value : string) {};

    public toString() : string {
        // return this.name + '="' + this.value + '"';
        return `${this.name}="${this.value}" ` 
    }
}

function superDetailedDebug(message: string){
    // console.log(message);
}

function debug(message : string) {
   console.log(message);
}
function error(message: string) {
    console.error(message);
}
function substring(target : string, from: number, to: number) {
    return target.substr(from, (to - from));
}


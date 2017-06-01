"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Class to handle parsing of XML Strings and convert them into "easy" accessible form
 */
var XmlParser = (function () {
    function XmlParser(xmlContent) {
        this.parseXml(xmlContent);
    }
    /**
     * Parses the given xml string into a hierarchical structure where the root node will be set to this.rootNode
     * @param content the xmlContent to be parsed
     */
    XmlParser.prototype.parseXml = function (content) {
        var xmlStart = -1;
        if ((xmlStart = content.indexOf('<?xml')) > -1) {
            var xmlEnd = content.indexOf('?>');
            if (xmlEnd < 0) {
                throw new Error('XmlDeclaration has no closing ?>');
            }
            xmlEnd += 2;
            superDetailedDebug('Removing xml declaration from: ' + xmlStart + " to: " + xmlEnd);
            content = content.substr(xmlEnd);
            superDetailedDebug('New content: ' + content);
        }
        content = this.removeComments(content);
        this.rootNode = new XmlNode(content, null);
    };
    /**
     * Removes all comments from  the xml string so they dont get in the way of parsing
     */
    XmlParser.prototype.removeComments = function (content) {
        var retVal = content;
        var commentStart = -1;
        while ((commentStart = retVal.indexOf('<!--')) > -1) {
            var commentEnd = retVal.indexOf('-->');
            if (commentEnd == -1) {
                throw new Error('Comment starting at position ' + commentStart + ' has no end tag');
            }
            superDetailedDebug('removing comment: ' + retVal.substr(commentStart, (commentEnd - commentStart) + 3));
            retVal = retVal.substr(0, commentStart) + retVal.substr(commentEnd + 3);
        }
        return retVal;
    };
    XmlParser.prototype.xPath = function (expression) {
        return this.rootNode == null ? null : this.rootNode.getAllChildrenMatchingPath(expression);
    };
    return XmlParser;
}());
exports.XmlParser = XmlParser;
/**
 * Class to represent the information from the xml-string in structured form
 */
var XmlNode = (function () {
    function XmlNode(xmlContent, parent) {
        this.xmlContent = xmlContent;
        this.parent = parent;
        // actual content
        this.attributes = [];
        this.childNodes = [];
        this.parseContent();
    }
    /**
     * Parses the xml content of the first node in the xmlContent including all child-nodes of the parsed node
     */
    XmlNode.prototype.parseContent = function () {
        var nodeFrom = this.xmlContent.indexOf('<');
        var nodeTo = this.xmlContent.indexOf('>', nodeFrom);
        if (nodeFrom > -1 && nodeTo > -1) {
            this.startingPosition = nodeFrom;
            this.nodeContent = this.xmlContent.substr(nodeFrom + 1, (nodeTo - nodeFrom - 1));
            superDetailedDebug("NodeContent: " + this.nodeContent);
            if (this.nodeContent.charAt(this.nodeContent.length - 1) == '/') {
                superDetailedDebug('Found end tag at the end of node');
                this.xmlContent = this.xmlContent.substr(0, nodeTo + 1);
                superDetailedDebug('Updated xmlContent to: ' + this.xmlContent);
                this.nodeContent = this.nodeContent.substr(0, this.nodeContent.length - 1);
                this.parseNodeContent();
            }
            else {
                this.parseNodeContent();
                var endTag = '</' + this.name + '>';
                var endIndex = this.xmlContent.indexOf(endTag, nodeTo);
                if (endIndex < 0) {
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
                while (childContentToParse.indexOf('<') > -1) {
                    superDetailedDebug('remaining childContent: ' + childContentToParse);
                    var child = new XmlNode(childContentToParse, this);
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
    };
    /**
     * Parses the content of the node xml (name + all attributes inside the tag)
     */
    XmlNode.prototype.parseNodeContent = function () {
        if (this.nodeContent == null || this.nodeContent.length < 1) {
            throw new Error('there is no nodeContent to parse!');
        }
        var allAttributes = this.nodeContent.split(' ');
        this.name = allAttributes[0];
        superDetailedDebug("Parsing content of node with name: " + this.name);
        var attrString = '';
        for (var i = 1; i < allAttributes.length; i++) {
            attrString = allAttributes[i];
            if (attrString.length > 0 && attrString.indexOf('=') > -1) {
                var attr = attrString.split('=');
                var val = attr[1].trim();
                if (val.charAt(0) == '"') {
                    val = val.substr(1);
                }
                if (val.charAt(val.length - 1) == '"') {
                    val = val.substr(0, val.length - 1);
                }
                this.attributes.push(new XmlAttribute(attr[0], val));
                superDetailedDebug("Parsed: " + this.attributes[this.attributes.length - 1].toString());
            }
            else if (allAttributes[i - 1].charAt(allAttributes[i - 1].length - 1) != '"') {
                // dirty way to concatenate split strings again
                var toAppend = attrString.charAt(attrString.length - 1) == '"' ? attrString.substr(0, attrString.length - 1) : attrString;
                this.attributes[this.attributes.length - 1].value += ' ' + toAppend;
            }
            else {
                error('Unparsable attribute: ' + attrString);
            }
        }
    };
    /**
     * formats the xml content into a printable text (non-html) version
     * @param indent prefix for each line
     */
    XmlNode.prototype.printContent = function (indent) {
        if (indent === void 0) { indent = ""; }
        var retVal = indent + ("<" + this.name + " ");
        this.attributes.forEach(function (element) {
            retVal += element.toString();
        });
        if (this.value != null && this.value != "") {
            retVal += "value=\"" + this.value + "\"";
        }
        retVal += '>';
        this.childNodes.forEach(function (element) {
            retVal += '\n' + element.printContent(indent + '  ');
        });
        retVal += '</' + this.name + '>';
        return retVal;
    };
    XmlNode.prototype.toOpenTagXml = function () {
        var retVal = "<" + this.name + " ";
        this.attributes.forEach(function (element) {
            retVal += element.name + "=\"" + element.value + "\" ";
        });
        retVal += ">";
        return retVal;
    };
    XmlNode.prototype.toCloseTagXml = function () {
        return "</" + this.name + ">";
    };
    /**
     * retrieves a list of nodes matching a given set of expressions concatenated by /
     * The expressions are to be digested by the function matchesExpression in this class.
     * If the expression starts with // all nodes will be considered as the start node instead of the root node
     *
     * @param requestPath the path to the desired node in the form of rootNode/expression/expression. The expressions must match the acceppted input of the method matchesExpression
     */
    XmlNode.prototype.getAllChildrenMatchingPath = function (requestPath) {
        if (requestPath == null || requestPath == "") {
            throw new Error('Invalid path: ' + requestPath);
        }
        var retVal = [];
        var workingNodes = [this];
        var iterationStart = 1;
        // if request path starts with // take all nodes as root nodes for the rest of the expression
        if (requestPath.indexOf('//') == 0) {
            workingNodes = this.getAllNodes();
            requestPath = requestPath.substr(2); // remove leading // and continue working
            iterationStart = 0;
        }
        // use special split as the test case for the manifest includes [@mimeType="video/mp4"] which would have been split after video
        var allParts = this.stringAwareSplit(requestPath, '/');
        //TODO: maybe skip this step
        if (iterationStart == 1 && !this.matchesExpression(allParts[0])) {
            return retVal;
        }
        var _loop_1 = function (i) {
            // clear at the start of each level
            retVal = [];
            workingNodes.forEach(function (node) {
                node.childNodes.forEach(function (child) {
                    if (child.matchesExpression(allParts[i])) {
                        retVal.push(child);
                    }
                });
            });
            // save in working nodes for next iteration
            workingNodes = retVal;
        };
        for (var i = iterationStart; i < allParts.length; i++) {
            _loop_1(i);
        }
        return retVal;
    };
    /**
     * Checks if this node matches the requirements of the given expression. Currently the following options are supported:
     * - name
     * - name[@attributeName="attributeValue"]
     * - * (matches Name)
     * - *[@attributeNama="attributeValue"] (matches all names and the given attribute value)
     *
     * @param expression the expression to be checked for matching this
     */
    XmlNode.prototype.matchesExpression = function (expression) {
        if (expression == null || expression == "") {
            throw new Error('Invalid expression: ' + expression);
        }
        var retVal = false;
        var nameSelector = expression;
        var expStart = -1;
        if ((expStart = expression.indexOf('[@')) > -1) {
            nameSelector = expression.substr(0, expStart);
        }
        if (nameSelector == '*') {
            retVal = true;
        }
        else if (this.name == nameSelector) {
            retVal = true;
        }
        if (retVal && expStart > -1) {
            retVal = false;
            // search for attribute
            var expEnd = expression.indexOf(']', expStart);
            if (expEnd == -1) {
                throw new Error('Attribute selector has no closing bracket: ' + expression.substr(expStart));
            }
            var attributeSelector = expression.substring(expStart, expEnd).split('=');
            if (attributeSelector.length == 1) {
                throw new Error('Invalid attribute selector: ' + attributeSelector[0] + '. Expected [@attrName="attrValue"]');
            }
            var attName_1 = attributeSelector[0].substr(2); // remove [@
            var attVal_1 = attributeSelector[1];
            if (attVal_1.charAt(0) == '"') {
                attVal_1 = attVal_1.substr(1);
            }
            if (attVal_1.charAt(attVal_1.length - 1) == '"') {
                attVal_1 = attVal_1.substring(0, attVal_1.length - 1);
            }
            this.attributes.forEach(function (attribute) {
                if (attribute.name == attName_1 && attribute.value == attVal_1) {
                    retVal = true;
                }
            });
        }
        return retVal;
    };
    /**
     * Retrieves a list of all nodes descending from this node including this node
     *
     * @param maxDepth the maximum number of levels this method should decend into before stopping (if greater/equal the max depth of the node this will have no effect)
     */
    XmlNode.prototype.getAllNodes = function (maxDepth) {
        if (maxDepth === void 0) { maxDepth = -1; }
        var retVal = [];
        var workingCopy = [this];
        var nextWorkingCopy = [];
        var hasAdded = true;
        while (hasAdded == true && maxDepth != 0) {
            hasAdded = false;
            workingCopy.forEach(function (element) {
                retVal.push(element);
                element.childNodes.forEach(function (child) {
                    nextWorkingCopy.push(child);
                });
                hasAdded = true;
            });
            workingCopy = nextWorkingCopy;
            nextWorkingCopy = [];
            maxDepth--;
        }
        return retVal;
    };
    /**
     * Spits a string while ignoring seperators between "
     * @param toSplit the string to be split
     * @param seperator the string to split at
     * @return all parts to toSplit which were seperated by the seperator outside of ""
     */
    XmlNode.prototype.stringAwareSplit = function (toSplit, seperator) {
        var retVal = [];
        var insideString = false;
        for (var i = 0; i < toSplit.length; i++) {
            if (toSplit.charAt(i) == '"') {
                insideString = insideString ? false : true;
            }
            else if (!insideString && toSplit.substr(i, seperator.length) == seperator) {
                retVal.push(toSplit.substring(0, i));
                toSplit = toSplit.substr(i + seperator.length);
                i = 0;
            }
        }
        if (toSplit != null && toSplit.trim().length > 0) {
            retVal.push(toSplit.trim());
        }
        return retVal;
    };
    /**
     * Searches this elements attributes for the first matching the attribute name
     *
     * @param attributeName the name of the searched attribute
     */
    XmlNode.prototype.getAttribute = function (attributeName) {
        for (var i = 0; i < this.attributes.length; i++) {
            if (this.attributes[i].name == attributeName) {
                return this.attributes[i];
            }
        }
        debug('Could not find attribute: "' + attributeName + '" on Node: ' + this.name);
        return null;
    };
    return XmlNode;
}());
exports.XmlNode = XmlNode;
/**
 * Class to represent a XML attribute with a value
 */
var XmlAttribute = (function () {
    function XmlAttribute(name, value) {
        this.name = name;
        this.value = value;
    }
    ;
    XmlAttribute.prototype.toString = function () {
        // return this.name + '="' + this.value + '"';
        return this.name + "=\"" + this.value + "\" ";
    };
    return XmlAttribute;
}());
exports.XmlAttribute = XmlAttribute;
function superDetailedDebug(message) {
    // console.log(message);
}
function debug(message) {
    console.log(message);
}
function error(message) {
    console.error(message);
}
function substring(target, from, to) {
    return target.substr(from, (to - from));
}

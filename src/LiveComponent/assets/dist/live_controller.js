import { Controller } from '@hotwired/stimulus';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

var DOCUMENT_FRAGMENT_NODE = 11;

function morphAttrs(fromNode, toNode) {
    var toNodeAttrs = toNode.attributes;
    var attr;
    var attrName;
    var attrNamespaceURI;
    var attrValue;
    var fromValue;

    // document-fragments dont have attributes so lets not do anything
    if (toNode.nodeType === DOCUMENT_FRAGMENT_NODE || fromNode.nodeType === DOCUMENT_FRAGMENT_NODE) {
      return;
    }

    // update attributes on original DOM element
    for (var i = toNodeAttrs.length - 1; i >= 0; i--) {
        attr = toNodeAttrs[i];
        attrName = attr.name;
        attrNamespaceURI = attr.namespaceURI;
        attrValue = attr.value;

        if (attrNamespaceURI) {
            attrName = attr.localName || attrName;
            fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);

            if (fromValue !== attrValue) {
                if (attr.prefix === 'xmlns'){
                    attrName = attr.name; // It's not allowed to set an attribute with the XMLNS namespace without specifying the `xmlns` prefix
                }
                fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
            }
        } else {
            fromValue = fromNode.getAttribute(attrName);

            if (fromValue !== attrValue) {
                fromNode.setAttribute(attrName, attrValue);
            }
        }
    }

    // Remove any extra attributes found on the original DOM element that
    // weren't found on the target element.
    var fromNodeAttrs = fromNode.attributes;

    for (var d = fromNodeAttrs.length - 1; d >= 0; d--) {
        attr = fromNodeAttrs[d];
        attrName = attr.name;
        attrNamespaceURI = attr.namespaceURI;

        if (attrNamespaceURI) {
            attrName = attr.localName || attrName;

            if (!toNode.hasAttributeNS(attrNamespaceURI, attrName)) {
                fromNode.removeAttributeNS(attrNamespaceURI, attrName);
            }
        } else {
            if (!toNode.hasAttribute(attrName)) {
                fromNode.removeAttribute(attrName);
            }
        }
    }
}

var range; // Create a range object for efficently rendering strings to elements.
var NS_XHTML = 'http://www.w3.org/1999/xhtml';

var doc = typeof document === 'undefined' ? undefined : document;
var HAS_TEMPLATE_SUPPORT = !!doc && 'content' in doc.createElement('template');
var HAS_RANGE_SUPPORT = !!doc && doc.createRange && 'createContextualFragment' in doc.createRange();

function createFragmentFromTemplate(str) {
    var template = doc.createElement('template');
    template.innerHTML = str;
    return template.content.childNodes[0];
}

function createFragmentFromRange(str) {
    if (!range) {
        range = doc.createRange();
        range.selectNode(doc.body);
    }

    var fragment = range.createContextualFragment(str);
    return fragment.childNodes[0];
}

function createFragmentFromWrap(str) {
    var fragment = doc.createElement('body');
    fragment.innerHTML = str;
    return fragment.childNodes[0];
}

/**
 * This is about the same
 * var html = new DOMParser().parseFromString(str, 'text/html');
 * return html.body.firstChild;
 *
 * @method toElement
 * @param {String} str
 */
function toElement(str) {
    str = str.trim();
    if (HAS_TEMPLATE_SUPPORT) {
      // avoid restrictions on content for things like `<tr><th>Hi</th></tr>` which
      // createContextualFragment doesn't support
      // <template> support not available in IE
      return createFragmentFromTemplate(str);
    } else if (HAS_RANGE_SUPPORT) {
      return createFragmentFromRange(str);
    }

    return createFragmentFromWrap(str);
}

/**
 * Returns true if two node's names are the same.
 *
 * NOTE: We don't bother checking `namespaceURI` because you will never find two HTML elements with the same
 *       nodeName and different namespace URIs.
 *
 * @param {Element} a
 * @param {Element} b The target element
 * @return {boolean}
 */
function compareNodeNames(fromEl, toEl) {
    var fromNodeName = fromEl.nodeName;
    var toNodeName = toEl.nodeName;
    var fromCodeStart, toCodeStart;

    if (fromNodeName === toNodeName) {
        return true;
    }

    fromCodeStart = fromNodeName.charCodeAt(0);
    toCodeStart = toNodeName.charCodeAt(0);

    // If the target element is a virtual DOM node or SVG node then we may
    // need to normalize the tag name before comparing. Normal HTML elements that are
    // in the "http://www.w3.org/1999/xhtml"
    // are converted to upper case
    if (fromCodeStart <= 90 && toCodeStart >= 97) { // from is upper and to is lower
        return fromNodeName === toNodeName.toUpperCase();
    } else if (toCodeStart <= 90 && fromCodeStart >= 97) { // to is upper and from is lower
        return toNodeName === fromNodeName.toUpperCase();
    } else {
        return false;
    }
}

/**
 * Create an element, optionally with a known namespace URI.
 *
 * @param {string} name the element name, e.g. 'div' or 'svg'
 * @param {string} [namespaceURI] the element's namespace URI, i.e. the value of
 * its `xmlns` attribute or its inferred namespace.
 *
 * @return {Element}
 */
function createElementNS(name, namespaceURI) {
    return !namespaceURI || namespaceURI === NS_XHTML ?
        doc.createElement(name) :
        doc.createElementNS(namespaceURI, name);
}

/**
 * Copies the children of one DOM element to another DOM element
 */
function moveChildren(fromEl, toEl) {
    var curChild = fromEl.firstChild;
    while (curChild) {
        var nextChild = curChild.nextSibling;
        toEl.appendChild(curChild);
        curChild = nextChild;
    }
    return toEl;
}

function syncBooleanAttrProp(fromEl, toEl, name) {
    if (fromEl[name] !== toEl[name]) {
        fromEl[name] = toEl[name];
        if (fromEl[name]) {
            fromEl.setAttribute(name, '');
        } else {
            fromEl.removeAttribute(name);
        }
    }
}

var specialElHandlers = {
    OPTION: function(fromEl, toEl) {
        var parentNode = fromEl.parentNode;
        if (parentNode) {
            var parentName = parentNode.nodeName.toUpperCase();
            if (parentName === 'OPTGROUP') {
                parentNode = parentNode.parentNode;
                parentName = parentNode && parentNode.nodeName.toUpperCase();
            }
            if (parentName === 'SELECT' && !parentNode.hasAttribute('multiple')) {
                if (fromEl.hasAttribute('selected') && !toEl.selected) {
                    // Workaround for MS Edge bug where the 'selected' attribute can only be
                    // removed if set to a non-empty value:
                    // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/12087679/
                    fromEl.setAttribute('selected', 'selected');
                    fromEl.removeAttribute('selected');
                }
                // We have to reset select element's selectedIndex to -1, otherwise setting
                // fromEl.selected using the syncBooleanAttrProp below has no effect.
                // The correct selectedIndex will be set in the SELECT special handler below.
                parentNode.selectedIndex = -1;
            }
        }
        syncBooleanAttrProp(fromEl, toEl, 'selected');
    },
    /**
     * The "value" attribute is special for the <input> element since it sets
     * the initial value. Changing the "value" attribute without changing the
     * "value" property will have no effect since it is only used to the set the
     * initial value.  Similar for the "checked" attribute, and "disabled".
     */
    INPUT: function(fromEl, toEl) {
        syncBooleanAttrProp(fromEl, toEl, 'checked');
        syncBooleanAttrProp(fromEl, toEl, 'disabled');

        if (fromEl.value !== toEl.value) {
            fromEl.value = toEl.value;
        }

        if (!toEl.hasAttribute('value')) {
            fromEl.removeAttribute('value');
        }
    },

    TEXTAREA: function(fromEl, toEl) {
        var newValue = toEl.value;
        if (fromEl.value !== newValue) {
            fromEl.value = newValue;
        }

        var firstChild = fromEl.firstChild;
        if (firstChild) {
            // Needed for IE. Apparently IE sets the placeholder as the
            // node value and vise versa. This ignores an empty update.
            var oldValue = firstChild.nodeValue;

            if (oldValue == newValue || (!newValue && oldValue == fromEl.placeholder)) {
                return;
            }

            firstChild.nodeValue = newValue;
        }
    },
    SELECT: function(fromEl, toEl) {
        if (!toEl.hasAttribute('multiple')) {
            var selectedIndex = -1;
            var i = 0;
            // We have to loop through children of fromEl, not toEl since nodes can be moved
            // from toEl to fromEl directly when morphing.
            // At the time this special handler is invoked, all children have already been morphed
            // and appended to / removed from fromEl, so using fromEl here is safe and correct.
            var curChild = fromEl.firstChild;
            var optgroup;
            var nodeName;
            while(curChild) {
                nodeName = curChild.nodeName && curChild.nodeName.toUpperCase();
                if (nodeName === 'OPTGROUP') {
                    optgroup = curChild;
                    curChild = optgroup.firstChild;
                } else {
                    if (nodeName === 'OPTION') {
                        if (curChild.hasAttribute('selected')) {
                            selectedIndex = i;
                            break;
                        }
                        i++;
                    }
                    curChild = curChild.nextSibling;
                    if (!curChild && optgroup) {
                        curChild = optgroup.nextSibling;
                        optgroup = null;
                    }
                }
            }

            fromEl.selectedIndex = selectedIndex;
        }
    }
};

var ELEMENT_NODE = 1;
var DOCUMENT_FRAGMENT_NODE$1 = 11;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

function noop() {}

function defaultGetNodeKey(node) {
  if (node) {
      return (node.getAttribute && node.getAttribute('id')) || node.id;
  }
}

function morphdomFactory(morphAttrs) {

    return function morphdom(fromNode, toNode, options) {
        if (!options) {
            options = {};
        }

        if (typeof toNode === 'string') {
            if (fromNode.nodeName === '#document' || fromNode.nodeName === 'HTML' || fromNode.nodeName === 'BODY') {
                var toNodeHtml = toNode;
                toNode = doc.createElement('html');
                toNode.innerHTML = toNodeHtml;
            } else {
                toNode = toElement(toNode);
            }
        }

        var getNodeKey = options.getNodeKey || defaultGetNodeKey;
        var onBeforeNodeAdded = options.onBeforeNodeAdded || noop;
        var onNodeAdded = options.onNodeAdded || noop;
        var onBeforeElUpdated = options.onBeforeElUpdated || noop;
        var onElUpdated = options.onElUpdated || noop;
        var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
        var onNodeDiscarded = options.onNodeDiscarded || noop;
        var onBeforeElChildrenUpdated = options.onBeforeElChildrenUpdated || noop;
        var childrenOnly = options.childrenOnly === true;

        // This object is used as a lookup to quickly find all keyed elements in the original DOM tree.
        var fromNodesLookup = Object.create(null);
        var keyedRemovalList = [];

        function addKeyedRemoval(key) {
            keyedRemovalList.push(key);
        }

        function walkDiscardedChildNodes(node, skipKeyedNodes) {
            if (node.nodeType === ELEMENT_NODE) {
                var curChild = node.firstChild;
                while (curChild) {

                    var key = undefined;

                    if (skipKeyedNodes && (key = getNodeKey(curChild))) {
                        // If we are skipping keyed nodes then we add the key
                        // to a list so that it can be handled at the very end.
                        addKeyedRemoval(key);
                    } else {
                        // Only report the node as discarded if it is not keyed. We do this because
                        // at the end we loop through all keyed elements that were unmatched
                        // and then discard them in one final pass.
                        onNodeDiscarded(curChild);
                        if (curChild.firstChild) {
                            walkDiscardedChildNodes(curChild, skipKeyedNodes);
                        }
                    }

                    curChild = curChild.nextSibling;
                }
            }
        }

        /**
         * Removes a DOM node out of the original DOM
         *
         * @param  {Node} node The node to remove
         * @param  {Node} parentNode The nodes parent
         * @param  {Boolean} skipKeyedNodes If true then elements with keys will be skipped and not discarded.
         * @return {undefined}
         */
        function removeNode(node, parentNode, skipKeyedNodes) {
            if (onBeforeNodeDiscarded(node) === false) {
                return;
            }

            if (parentNode) {
                parentNode.removeChild(node);
            }

            onNodeDiscarded(node);
            walkDiscardedChildNodes(node, skipKeyedNodes);
        }

        // // TreeWalker implementation is no faster, but keeping this around in case this changes in the future
        // function indexTree(root) {
        //     var treeWalker = document.createTreeWalker(
        //         root,
        //         NodeFilter.SHOW_ELEMENT);
        //
        //     var el;
        //     while((el = treeWalker.nextNode())) {
        //         var key = getNodeKey(el);
        //         if (key) {
        //             fromNodesLookup[key] = el;
        //         }
        //     }
        // }

        // // NodeIterator implementation is no faster, but keeping this around in case this changes in the future
        //
        // function indexTree(node) {
        //     var nodeIterator = document.createNodeIterator(node, NodeFilter.SHOW_ELEMENT);
        //     var el;
        //     while((el = nodeIterator.nextNode())) {
        //         var key = getNodeKey(el);
        //         if (key) {
        //             fromNodesLookup[key] = el;
        //         }
        //     }
        // }

        function indexTree(node) {
            if (node.nodeType === ELEMENT_NODE || node.nodeType === DOCUMENT_FRAGMENT_NODE$1) {
                var curChild = node.firstChild;
                while (curChild) {
                    var key = getNodeKey(curChild);
                    if (key) {
                        fromNodesLookup[key] = curChild;
                    }

                    // Walk recursively
                    indexTree(curChild);

                    curChild = curChild.nextSibling;
                }
            }
        }

        indexTree(fromNode);

        function handleNodeAdded(el) {
            onNodeAdded(el);

            var curChild = el.firstChild;
            while (curChild) {
                var nextSibling = curChild.nextSibling;

                var key = getNodeKey(curChild);
                if (key) {
                    var unmatchedFromEl = fromNodesLookup[key];
                    // if we find a duplicate #id node in cache, replace `el` with cache value
                    // and morph it to the child node.
                    if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
                        curChild.parentNode.replaceChild(unmatchedFromEl, curChild);
                        morphEl(unmatchedFromEl, curChild);
                    } else {
                      handleNodeAdded(curChild);
                    }
                } else {
                  // recursively call for curChild and it's children to see if we find something in
                  // fromNodesLookup
                  handleNodeAdded(curChild);
                }

                curChild = nextSibling;
            }
        }

        function cleanupFromEl(fromEl, curFromNodeChild, curFromNodeKey) {
            // We have processed all of the "to nodes". If curFromNodeChild is
            // non-null then we still have some from nodes left over that need
            // to be removed
            while (curFromNodeChild) {
                var fromNextSibling = curFromNodeChild.nextSibling;
                if ((curFromNodeKey = getNodeKey(curFromNodeChild))) {
                    // Since the node is keyed it might be matched up later so we defer
                    // the actual removal to later
                    addKeyedRemoval(curFromNodeKey);
                } else {
                    // NOTE: we skip nested keyed nodes from being removed since there is
                    //       still a chance they will be matched up later
                    removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                }
                curFromNodeChild = fromNextSibling;
            }
        }

        function morphEl(fromEl, toEl, childrenOnly) {
            var toElKey = getNodeKey(toEl);

            if (toElKey) {
                // If an element with an ID is being morphed then it will be in the final
                // DOM so clear it out of the saved elements collection
                delete fromNodesLookup[toElKey];
            }

            if (!childrenOnly) {
                // optional
                if (onBeforeElUpdated(fromEl, toEl) === false) {
                    return;
                }

                // update attributes on original DOM element first
                morphAttrs(fromEl, toEl);
                // optional
                onElUpdated(fromEl);

                if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
                    return;
                }
            }

            if (fromEl.nodeName !== 'TEXTAREA') {
              morphChildren(fromEl, toEl);
            } else {
              specialElHandlers.TEXTAREA(fromEl, toEl);
            }
        }

        function morphChildren(fromEl, toEl) {
            var curToNodeChild = toEl.firstChild;
            var curFromNodeChild = fromEl.firstChild;
            var curToNodeKey;
            var curFromNodeKey;

            var fromNextSibling;
            var toNextSibling;
            var matchingFromEl;

            // walk the children
            outer: while (curToNodeChild) {
                toNextSibling = curToNodeChild.nextSibling;
                curToNodeKey = getNodeKey(curToNodeChild);

                // walk the fromNode children all the way through
                while (curFromNodeChild) {
                    fromNextSibling = curFromNodeChild.nextSibling;

                    if (curToNodeChild.isSameNode && curToNodeChild.isSameNode(curFromNodeChild)) {
                        curToNodeChild = toNextSibling;
                        curFromNodeChild = fromNextSibling;
                        continue outer;
                    }

                    curFromNodeKey = getNodeKey(curFromNodeChild);

                    var curFromNodeType = curFromNodeChild.nodeType;

                    // this means if the curFromNodeChild doesnt have a match with the curToNodeChild
                    var isCompatible = undefined;

                    if (curFromNodeType === curToNodeChild.nodeType) {
                        if (curFromNodeType === ELEMENT_NODE) {
                            // Both nodes being compared are Element nodes

                            if (curToNodeKey) {
                                // The target node has a key so we want to match it up with the correct element
                                // in the original DOM tree
                                if (curToNodeKey !== curFromNodeKey) {
                                    // The current element in the original DOM tree does not have a matching key so
                                    // let's check our lookup to see if there is a matching element in the original
                                    // DOM tree
                                    if ((matchingFromEl = fromNodesLookup[curToNodeKey])) {
                                        if (fromNextSibling === matchingFromEl) {
                                            // Special case for single element removals. To avoid removing the original
                                            // DOM node out of the tree (since that can break CSS transitions, etc.),
                                            // we will instead discard the current node and wait until the next
                                            // iteration to properly match up the keyed target element with its matching
                                            // element in the original tree
                                            isCompatible = false;
                                        } else {
                                            // We found a matching keyed element somewhere in the original DOM tree.
                                            // Let's move the original DOM node into the current position and morph
                                            // it.

                                            // NOTE: We use insertBefore instead of replaceChild because we want to go through
                                            // the `removeNode()` function for the node that is being discarded so that
                                            // all lifecycle hooks are correctly invoked
                                            fromEl.insertBefore(matchingFromEl, curFromNodeChild);

                                            // fromNextSibling = curFromNodeChild.nextSibling;

                                            if (curFromNodeKey) {
                                                // Since the node is keyed it might be matched up later so we defer
                                                // the actual removal to later
                                                addKeyedRemoval(curFromNodeKey);
                                            } else {
                                                // NOTE: we skip nested keyed nodes from being removed since there is
                                                //       still a chance they will be matched up later
                                                removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                                            }

                                            curFromNodeChild = matchingFromEl;
                                        }
                                    } else {
                                        // The nodes are not compatible since the "to" node has a key and there
                                        // is no matching keyed node in the source tree
                                        isCompatible = false;
                                    }
                                }
                            } else if (curFromNodeKey) {
                                // The original has a key
                                isCompatible = false;
                            }

                            isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild);
                            if (isCompatible) {
                                // We found compatible DOM elements so transform
                                // the current "from" node to match the current
                                // target DOM node.
                                // MORPH
                                morphEl(curFromNodeChild, curToNodeChild);
                            }

                        } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
                            // Both nodes being compared are Text or Comment nodes
                            isCompatible = true;
                            // Simply update nodeValue on the original node to
                            // change the text value
                            if (curFromNodeChild.nodeValue !== curToNodeChild.nodeValue) {
                                curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                            }

                        }
                    }

                    if (isCompatible) {
                        // Advance both the "to" child and the "from" child since we found a match
                        // Nothing else to do as we already recursively called morphChildren above
                        curToNodeChild = toNextSibling;
                        curFromNodeChild = fromNextSibling;
                        continue outer;
                    }

                    // No compatible match so remove the old node from the DOM and continue trying to find a
                    // match in the original DOM. However, we only do this if the from node is not keyed
                    // since it is possible that a keyed node might match up with a node somewhere else in the
                    // target tree and we don't want to discard it just yet since it still might find a
                    // home in the final DOM tree. After everything is done we will remove any keyed nodes
                    // that didn't find a home
                    if (curFromNodeKey) {
                        // Since the node is keyed it might be matched up later so we defer
                        // the actual removal to later
                        addKeyedRemoval(curFromNodeKey);
                    } else {
                        // NOTE: we skip nested keyed nodes from being removed since there is
                        //       still a chance they will be matched up later
                        removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                    }

                    curFromNodeChild = fromNextSibling;
                } // END: while(curFromNodeChild) {}

                // If we got this far then we did not find a candidate match for
                // our "to node" and we exhausted all of the children "from"
                // nodes. Therefore, we will just append the current "to" node
                // to the end
                if (curToNodeKey && (matchingFromEl = fromNodesLookup[curToNodeKey]) && compareNodeNames(matchingFromEl, curToNodeChild)) {
                    fromEl.appendChild(matchingFromEl);
                    // MORPH
                    morphEl(matchingFromEl, curToNodeChild);
                } else {
                    var onBeforeNodeAddedResult = onBeforeNodeAdded(curToNodeChild);
                    if (onBeforeNodeAddedResult !== false) {
                        if (onBeforeNodeAddedResult) {
                            curToNodeChild = onBeforeNodeAddedResult;
                        }

                        if (curToNodeChild.actualize) {
                            curToNodeChild = curToNodeChild.actualize(fromEl.ownerDocument || doc);
                        }
                        fromEl.appendChild(curToNodeChild);
                        handleNodeAdded(curToNodeChild);
                    }
                }

                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
            }

            cleanupFromEl(fromEl, curFromNodeChild, curFromNodeKey);

            var specialElHandler = specialElHandlers[fromEl.nodeName];
            if (specialElHandler) {
                specialElHandler(fromEl, toEl);
            }
        } // END: morphChildren(...)

        var morphedNode = fromNode;
        var morphedNodeType = morphedNode.nodeType;
        var toNodeType = toNode.nodeType;

        if (!childrenOnly) {
            // Handle the case where we are given two DOM nodes that are not
            // compatible (e.g. <div> --> <span> or <div> --> TEXT)
            if (morphedNodeType === ELEMENT_NODE) {
                if (toNodeType === ELEMENT_NODE) {
                    if (!compareNodeNames(fromNode, toNode)) {
                        onNodeDiscarded(fromNode);
                        morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
                    }
                } else {
                    // Going from an element node to a text node
                    morphedNode = toNode;
                }
            } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) { // Text or comment node
                if (toNodeType === morphedNodeType) {
                    if (morphedNode.nodeValue !== toNode.nodeValue) {
                        morphedNode.nodeValue = toNode.nodeValue;
                    }

                    return morphedNode;
                } else {
                    // Text node to something else
                    morphedNode = toNode;
                }
            }
        }

        if (morphedNode === toNode) {
            // The "to node" was not compatible with the "from node" so we had to
            // toss out the "from node" and use the "to node"
            onNodeDiscarded(fromNode);
        } else {
            if (toNode.isSameNode && toNode.isSameNode(morphedNode)) {
                return;
            }

            morphEl(morphedNode, toNode, childrenOnly);

            // We now need to loop over any keyed nodes that might need to be
            // removed. We only do the removal if we know that the keyed node
            // never found a match. When a keyed node is matched up we remove
            // it out of fromNodesLookup and we use fromNodesLookup to determine
            // if a keyed node has been matched up or not
            if (keyedRemovalList) {
                for (var i=0, len=keyedRemovalList.length; i<len; i++) {
                    var elToRemove = fromNodesLookup[keyedRemovalList[i]];
                    if (elToRemove) {
                        removeNode(elToRemove, elToRemove.parentNode, false);
                    }
                }
            }
        }

        if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
            if (morphedNode.actualize) {
                morphedNode = morphedNode.actualize(fromNode.ownerDocument || doc);
            }
            // If we had to swap out the from node with a new node because the old
            // node was not compatible with the target node then we need to
            // replace the old DOM node in the original DOM tree. This is only
            // possible if the original DOM node was part of a DOM tree which
            // we know is the case if it has a parent node.
            fromNode.parentNode.replaceChild(morphedNode, fromNode);
        }

        return morphedNode;
    };
}

var morphdom = morphdomFactory(morphAttrs);

function parseDirectives(content) {
    const directives = [];
    if (!content) {
        return directives;
    }
    let currentActionName = '';
    let currentArgumentName = '';
    let currentArgumentValue = '';
    let currentArguments = [];
    let currentNamedArguments = {};
    let currentModifiers = [];
    let state = 'action';
    const getLastActionName = function () {
        if (currentActionName) {
            return currentActionName;
        }
        if (directives.length === 0) {
            throw new Error('Could not find any directives');
        }
        return directives[directives.length - 1].action;
    };
    const pushInstruction = function () {
        directives.push({
            action: currentActionName,
            args: currentArguments,
            named: currentNamedArguments,
            modifiers: currentModifiers,
            getString: () => {
                return content;
            }
        });
        currentActionName = '';
        currentArgumentName = '';
        currentArgumentValue = '';
        currentArguments = [];
        currentNamedArguments = {};
        currentModifiers = [];
        state = 'action';
    };
    const pushArgument = function () {
        const mixedArgTypesError = () => {
            throw new Error(`Normal and named arguments cannot be mixed inside "${currentActionName}()"`);
        };
        if (currentArgumentName) {
            if (currentArguments.length > 0) {
                mixedArgTypesError();
            }
            currentNamedArguments[currentArgumentName.trim()] = currentArgumentValue;
        }
        else {
            if (Object.keys(currentNamedArguments).length > 0) {
                mixedArgTypesError();
            }
            currentArguments.push(currentArgumentValue.trim());
        }
        currentArgumentName = '';
        currentArgumentValue = '';
    };
    const pushModifier = function () {
        if (currentArguments.length > 1) {
            throw new Error(`The modifier "${currentActionName}()" does not support multiple arguments.`);
        }
        if (Object.keys(currentNamedArguments).length > 0) {
            throw new Error(`The modifier "${currentActionName}()" does not support named arguments.`);
        }
        currentModifiers.push({
            name: currentActionName,
            value: currentArguments.length > 0 ? currentArguments[0] : null,
        });
        currentActionName = '';
        currentArgumentName = '';
        currentArguments = [];
        state = 'action';
    };
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        switch (state) {
            case 'action':
                if (char === '(') {
                    state = 'arguments';
                    break;
                }
                if (char === ' ') {
                    if (currentActionName) {
                        pushInstruction();
                    }
                    break;
                }
                if (char === '|') {
                    pushModifier();
                    break;
                }
                currentActionName += char;
                break;
            case 'arguments':
                if (char === ')') {
                    pushArgument();
                    state = 'after_arguments';
                    break;
                }
                if (char === ',') {
                    pushArgument();
                    break;
                }
                if (char === '=') {
                    currentArgumentName = currentArgumentValue;
                    currentArgumentValue = '';
                    break;
                }
                currentArgumentValue += char;
                break;
            case 'after_arguments':
                if (char === '|') {
                    pushModifier();
                    break;
                }
                if (char !== ' ') {
                    throw new Error(`Missing space after ${getLastActionName()}()`);
                }
                pushInstruction();
                break;
        }
    }
    switch (state) {
        case 'action':
        case 'after_arguments':
            if (currentActionName) {
                pushInstruction();
            }
            break;
        default:
            throw new Error(`Did you forget to add a closing ")" after "${currentActionName}"?`);
    }
    return directives;
}

function combineSpacedArray(parts) {
    const finalParts = [];
    parts.forEach((part) => {
        finalParts.push(...part.split(' '));
    });
    return finalParts;
}
function normalizeModelName(model) {
    return model
        .replace(/\[]$/, '')
        .split('[')
        .map(function (s) {
        return s.replace(']', '');
    })
        .join('.');
}

function haveRenderedValuesChanged(originalDataJson, currentDataJson, newDataJson) {
    if (originalDataJson === newDataJson) {
        return false;
    }
    if (currentDataJson === newDataJson) {
        return false;
    }
    const originalData = JSON.parse(originalDataJson);
    const newData = JSON.parse(newDataJson);
    const changedKeys = Object.keys(newData);
    Object.entries(originalData).forEach(([key, value]) => {
        if (value === newData[key]) {
            changedKeys.splice(changedKeys.indexOf(key), 1);
        }
    });
    const currentData = JSON.parse(currentDataJson);
    let keyHasChanged = false;
    changedKeys.forEach((key) => {
        if (currentData[key] !== newData[key]) {
            keyHasChanged = true;
        }
    });
    return keyHasChanged;
}

function normalizeAttributesForComparison(element) {
    const isFileInput = element instanceof HTMLInputElement && element.type === 'file';
    if (!isFileInput) {
        if ('value' in element) {
            element.setAttribute('value', element.value);
        }
        else if (element.hasAttribute('value')) {
            element.setAttribute('value', '');
        }
    }
    Array.from(element.children).forEach((child) => {
        normalizeAttributesForComparison(child);
    });
}

function getDeepData(data, propertyPath) {
    const { currentLevelData, finalKey } = parseDeepData(data, propertyPath);
    return currentLevelData[finalKey];
}
const parseDeepData = function (data, propertyPath) {
    const finalData = JSON.parse(JSON.stringify(data));
    let currentLevelData = finalData;
    const parts = propertyPath.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
        currentLevelData = currentLevelData[parts[i]];
    }
    const finalKey = parts[parts.length - 1];
    return {
        currentLevelData,
        finalData,
        finalKey,
        parts
    };
};
function setDeepData(data, propertyPath, value) {
    const { currentLevelData, finalData, finalKey, parts } = parseDeepData(data, propertyPath);
    if (typeof currentLevelData !== 'object') {
        const lastPart = parts.pop();
        if (typeof currentLevelData === 'undefined') {
            throw new Error(`Cannot set data-model="${propertyPath}". The parent "${parts.join('.')}" data does not exist. Did you forget to expose "${parts[0]}" as a LiveProp?`);
        }
        throw new Error(`Cannot set data-model="${propertyPath}". The parent "${parts.join('.')}" data does not appear to be an object (it's "${currentLevelData}"). Did you forget to add exposed={"${lastPart}"} to its LiveProp?`);
    }
    if (currentLevelData[finalKey] === undefined) {
        const lastPart = parts.pop();
        if (parts.length > 0) {
            throw new Error(`The model name ${propertyPath} was never initialized. Did you forget to add exposed={"${lastPart}"} to its LiveProp?`);
        }
        else {
            throw new Error(`The model name "${propertyPath}" was never initialized. Did you forget to expose "${lastPart}" as a LiveProp? Available models values are: ${Object.keys(data).length > 0 ? Object.keys(data).join(', ') : '(none)'}`);
        }
    }
    currentLevelData[finalKey] = value;
    return finalData;
}

class ValueStore {
    constructor(liveController) {
        this.controller = liveController;
    }
    get(name) {
        const normalizedName = normalizeModelName(name);
        return getDeepData(this.controller.dataValue, normalizedName);
    }
    has(name) {
        return this.get(name) !== undefined;
    }
    set(name, value) {
        const normalizedName = normalizeModelName(name);
        this.controller.dataValue = setDeepData(this.controller.dataValue, normalizedName, value);
    }
    hasAtTopLevel(name) {
        const parts = name.split('.');
        return this.controller.dataValue[parts[0]] !== undefined;
    }
    asJson() {
        return JSON.stringify(this.controller.dataValue);
    }
}

function getValueFromInput(element, valueStore) {
    if (element instanceof HTMLInputElement) {
        if (element.type === 'checkbox') {
            const modelNameData = getModelDirectiveFromInput(element);
            if (modelNameData === null) {
                return null;
            }
            const modelValue = valueStore.get(modelNameData.action);
            if (Array.isArray(modelValue)) {
                return getMultipleCheckboxValue(element, modelValue);
            }
            return element.checked ? inputValue(element) : null;
        }
        return inputValue(element);
    }
    if (element instanceof HTMLSelectElement) {
        if (element.multiple) {
            return Array.from(element.selectedOptions).map(el => el.value);
        }
        return element.value;
    }
    if (element.dataset.value) {
        return element.dataset.value;
    }
    if ('value' in element) {
        return element.value;
    }
    if (element.hasAttribute('value')) {
        return element.getAttribute('value');
    }
    return null;
}
function getModelDirectiveFromInput(element, throwOnMissing = true) {
    if (element.dataset.model) {
        const directives = parseDirectives(element.dataset.model);
        const directive = directives[0];
        if (directive.args.length > 0 || directive.named.length > 0) {
            throw new Error(`The data-model="${element.dataset.model}" format is invalid: it does not support passing arguments to the model.`);
        }
        directive.action = normalizeModelName(directive.action);
        return directive;
    }
    if (element.getAttribute('name')) {
        const formElement = element.closest('form');
        if (formElement && ('model' in formElement.dataset)) {
            const directives = parseDirectives(formElement.dataset.model || '*');
            const directive = directives[0];
            if (directive.args.length > 0 || directive.named.length > 0) {
                throw new Error(`The data-model="${formElement.dataset.model}" format is invalid: it does not support passing arguments to the model.`);
            }
            directive.action = normalizeModelName(element.getAttribute('name'));
            return directive;
        }
    }
    if (!throwOnMissing) {
        return null;
    }
    throw new Error(`Cannot determine the model name for "${getElementAsTagText(element)}": the element must either have a "data-model" (or "name" attribute living inside a <form data-model="*">).`);
}
function elementBelongsToThisController(element, controller) {
    if (controller.element !== element && !controller.element.contains(element)) {
        return false;
    }
    let foundChildController = false;
    controller.childComponentControllers.forEach((childComponentController) => {
        if (foundChildController) {
            return;
        }
        if (childComponentController.element === element || childComponentController.element.contains(element)) {
            foundChildController = true;
        }
    });
    return !foundChildController;
}
function cloneHTMLElement(element) {
    const newElement = element.cloneNode(true);
    if (!(newElement instanceof HTMLElement)) {
        throw new Error('Could not clone element');
    }
    return newElement;
}
function htmlToElement(html) {
    const template = document.createElement('template');
    html = html.trim();
    template.innerHTML = html;
    const child = template.content.firstChild;
    if (!child) {
        throw new Error('Child not found');
    }
    if (!(child instanceof HTMLElement)) {
        throw new Error(`Created element is not an Element from HTML: ${html.trim()}`);
    }
    return child;
}
function getElementAsTagText(element) {
    return element.innerHTML ? element.outerHTML.slice(0, element.outerHTML.indexOf(element.innerHTML)) : element.outerHTML;
}
const getMultipleCheckboxValue = function (element, currentValues) {
    const value = inputValue(element);
    const index = currentValues.indexOf(value);
    if (element.checked) {
        if (index === -1) {
            currentValues.push(value);
        }
        return currentValues;
    }
    if (index > -1) {
        currentValues.splice(index, 1);
    }
    return currentValues;
};
const inputValue = function (element) {
    return element.dataset.value ? element.dataset.value : element.value;
};

var _UnsyncedInputContainer_mappedFields, _UnsyncedInputContainer_unmappedFields;
class UnsyncedInputContainer {
    constructor() {
        _UnsyncedInputContainer_mappedFields.set(this, void 0);
        _UnsyncedInputContainer_unmappedFields.set(this, []);
        __classPrivateFieldSet(this, _UnsyncedInputContainer_mappedFields, new Map(), "f");
    }
    add(element, modelName = null) {
        if (modelName) {
            __classPrivateFieldGet(this, _UnsyncedInputContainer_mappedFields, "f").set(modelName, element);
            return;
        }
        __classPrivateFieldGet(this, _UnsyncedInputContainer_unmappedFields, "f").push(element);
    }
    all() {
        return [...__classPrivateFieldGet(this, _UnsyncedInputContainer_unmappedFields, "f"), ...__classPrivateFieldGet(this, _UnsyncedInputContainer_mappedFields, "f").values()];
    }
    clone() {
        const container = new UnsyncedInputContainer();
        __classPrivateFieldSet(container, _UnsyncedInputContainer_mappedFields, new Map(__classPrivateFieldGet(this, _UnsyncedInputContainer_mappedFields, "f")), "f");
        __classPrivateFieldSet(container, _UnsyncedInputContainer_unmappedFields, [...__classPrivateFieldGet(this, _UnsyncedInputContainer_unmappedFields, "f")], "f");
        return container;
    }
    allMappedFields() {
        return __classPrivateFieldGet(this, _UnsyncedInputContainer_mappedFields, "f");
    }
    remove(modelName) {
        __classPrivateFieldGet(this, _UnsyncedInputContainer_mappedFields, "f").delete(modelName);
    }
}
_UnsyncedInputContainer_mappedFields = new WeakMap(), _UnsyncedInputContainer_unmappedFields = new WeakMap();

var _PromiseStack_instances, _PromiseStack_findPromiseIndex;
const DEFAULT_DEBOUNCE = 150;
class default_1 extends Controller {
    constructor() {
        super(...arguments);
        this.renderDebounceTimeout = null;
        this.actionDebounceTimeout = null;
        this.renderPromiseStack = new PromiseStack();
        this.isActionProcessing = false;
        this.pollingIntervals = [];
        this.isWindowUnloaded = false;
        this.originalDataJSON = '{}';
        this.mutationObserver = null;
        this.childComponentControllers = [];
        this.pendingActionTriggerModelElement = null;
        this.markAsWindowUnloaded = () => {
            this.isWindowUnloaded = true;
        };
    }
    initialize() {
        this.markAsWindowUnloaded = this.markAsWindowUnloaded.bind(this);
        this.handleUpdateModelEvent = this.handleUpdateModelEvent.bind(this);
        this.handleInputEvent = this.handleInputEvent.bind(this);
        this.handleChangeEvent = this.handleChangeEvent.bind(this);
        this.handleConnectedControllerEvent = this.handleConnectedControllerEvent.bind(this);
        this.handleDisconnectedControllerEvent = this.handleDisconnectedControllerEvent.bind(this);
        this.valueStore = new ValueStore(this);
        this.originalDataJSON = this.valueStore.asJson();
        this.unsyncedInputs = new UnsyncedInputContainer();
        this._exposeOriginalData();
    }
    connect() {
        this._onLoadingFinish();
        if (!(this.element instanceof HTMLElement)) {
            throw new Error('Invalid Element Type');
        }
        this._initiatePolling();
        window.addEventListener('beforeunload', this.markAsWindowUnloaded);
        this._startAttributesMutationObserver();
        this.element.addEventListener('live:update-model', this.handleUpdateModelEvent);
        this.element.addEventListener('input', this.handleInputEvent);
        this.element.addEventListener('change', this.handleChangeEvent);
        this.element.addEventListener('live:connect', this.handleConnectedControllerEvent);
        this._dispatchEvent('live:connect', { controller: this });
    }
    disconnect() {
        this._stopAllPolling();
        window.removeEventListener('beforeunload', this.markAsWindowUnloaded);
        this.element.removeEventListener('live:update-model', this.handleUpdateModelEvent);
        this.element.removeEventListener('input', this.handleInputEvent);
        this.element.removeEventListener('change', this.handleChangeEvent);
        this.element.removeEventListener('live:connect', this.handleConnectedControllerEvent);
        this.element.removeEventListener('live:disconnect', this.handleDisconnectedControllerEvent);
        this._dispatchEvent('live:disconnect', { controller: this });
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
    }
    update(event) {
        if (event.type === 'input' || event.type === 'change') {
            throw new Error(`Since LiveComponents 2.3, you no longer need data-action="live#update" on form elements. Found on element: ${getElementAsTagText(event.target)}`);
        }
        this._updateModelFromElement(event.target, null);
    }
    action(event) {
        const rawAction = event.currentTarget.dataset.actionName;
        const directives = parseDirectives(rawAction);
        directives.forEach((directive) => {
            const _executeAction = () => {
                this._clearWaitingDebouncedRenders();
                this._makeRequest(directive.action, directive.named);
            };
            let handled = false;
            directive.modifiers.forEach((modifier) => {
                switch (modifier.name) {
                    case 'prevent':
                        event.preventDefault();
                        break;
                    case 'stop':
                        event.stopPropagation();
                        break;
                    case 'self':
                        if (event.target !== event.currentTarget) {
                            return;
                        }
                        break;
                    case 'debounce': {
                        const length = modifier.value ? parseInt(modifier.value) : this.getDefaultDebounce();
                        if (this.actionDebounceTimeout) {
                            clearTimeout(this.actionDebounceTimeout);
                            this.actionDebounceTimeout = null;
                        }
                        this.actionDebounceTimeout = window.setTimeout(() => {
                            this.actionDebounceTimeout = null;
                            _executeAction();
                        }, length);
                        handled = true;
                        break;
                    }
                    default:
                        console.warn(`Unknown modifier ${modifier.name} in action ${rawAction}`);
                }
            });
            if (!handled) {
                if (getModelDirectiveFromInput(event.currentTarget, false)) {
                    this.pendingActionTriggerModelElement = event.currentTarget;
                    window.setTimeout(() => {
                        this.pendingActionTriggerModelElement = null;
                        _executeAction();
                    }, 10);
                    return;
                }
                _executeAction();
            }
        });
    }
    $render() {
        this._makeRequest(null, {});
    }
    _updateModelFromElement(element, eventName) {
        if (!elementBelongsToThisController(element, this)) {
            return;
        }
        if (!(element instanceof HTMLElement)) {
            throw new Error('Could not update model for non HTMLElement');
        }
        const modelDirective = getModelDirectiveFromInput(element, false);
        if (eventName === 'input') {
            const modelName = modelDirective ? modelDirective.action : null;
            this.renderPromiseStack.addModifiedElement(element, modelName);
            this.unsyncedInputs.add(element, modelName);
        }
        if (!modelDirective) {
            return;
        }
        let shouldRender = true;
        let targetEventName = 'input';
        let debounce = null;
        modelDirective.modifiers.forEach((modifier) => {
            switch (modifier.name) {
                case 'on':
                    if (!modifier.value) {
                        throw new Error(`The "on" modifier in ${modelDirective.getString()} requires a value - e.g. on(change).`);
                    }
                    if (!['input', 'change'].includes(modifier.value)) {
                        throw new Error(`The "on" modifier in ${modelDirective.getString()} only accepts the arguments "input" or "change".`);
                    }
                    targetEventName = modifier.value;
                    break;
                case 'norender':
                    shouldRender = false;
                    break;
                case 'debounce':
                    debounce = modifier.value ? parseInt(modifier.value) : this.getDefaultDebounce();
                    break;
                default:
                    console.warn(`Unknown modifier "${modifier.name}" in data-model="${modelDirective.getString()}".`);
            }
        });
        if (this.pendingActionTriggerModelElement === element) {
            shouldRender = false;
        }
        if (eventName && targetEventName !== eventName) {
            return;
        }
        if (null === debounce) {
            if (targetEventName === 'input') {
                debounce = this.getDefaultDebounce();
            }
            else {
                debounce = 0;
            }
        }
        const finalValue = getValueFromInput(element, this.valueStore);
        this.$updateModel(modelDirective.action, finalValue, shouldRender, element.hasAttribute('name') ? element.getAttribute('name') : null, {
            debounce
        });
    }
    $updateModel(model, value, shouldRender = true, extraModelName = null, options = {}) {
        const modelName = normalizeModelName(model);
        const normalizedExtraModelName = extraModelName ? normalizeModelName(extraModelName) : null;
        if (this.valueStore.has('validatedFields')) {
            const validatedFields = [...this.valueStore.get('validatedFields')];
            if (validatedFields.indexOf(modelName) === -1) {
                validatedFields.push(modelName);
            }
            this.valueStore.set('validatedFields', validatedFields);
        }
        if (options.dispatch !== false) {
            this._dispatchEvent('live:update-model', {
                modelName,
                extraModelName: normalizedExtraModelName,
                value
            });
        }
        this.valueStore.set(modelName, value);
        this.unsyncedInputs.remove(modelName);
        if (shouldRender && !this.isActionProcessing) {
            this._clearWaitingDebouncedRenders();
            let debounce = this.getDefaultDebounce();
            if (options.debounce !== undefined && options.debounce !== null) {
                debounce = options.debounce;
            }
            this.renderDebounceTimeout = window.setTimeout(() => {
                this.renderDebounceTimeout = null;
                this.$render();
            }, debounce);
        }
    }
    _makeRequest(action, args) {
        const splitUrl = this.urlValue.split('?');
        let [url] = splitUrl;
        const [, queryString] = splitUrl;
        const params = new URLSearchParams(queryString || '');
        if (typeof args === 'object' && Object.keys(args).length > 0) {
            params.set('args', new URLSearchParams(args).toString());
        }
        const fetchOptions = {};
        fetchOptions.headers = {
            'Accept': 'application/vnd.live-component+html',
        };
        if (action) {
            this.isActionProcessing = true;
            url += `/${encodeURIComponent(action)}`;
            if (this.csrfValue) {
                fetchOptions.headers['X-CSRF-TOKEN'] = this.csrfValue;
            }
        }
        let dataAdded = false;
        if (!action) {
            const dataJson = this.valueStore.asJson();
            if (this._willDataFitInUrl(dataJson, params)) {
                params.set('data', dataJson);
                fetchOptions.method = 'GET';
                dataAdded = true;
            }
        }
        if (!dataAdded) {
            fetchOptions.method = 'POST';
            fetchOptions.body = this.valueStore.asJson();
            fetchOptions.headers['Content-Type'] = 'application/json';
        }
        this._onLoadingStart();
        const paramsString = params.toString();
        const thisPromise = fetch(`${url}${paramsString.length > 0 ? `?${paramsString}` : ''}`, fetchOptions);
        const reRenderPromise = new ReRenderPromise(thisPromise, this.unsyncedInputs.clone());
        this.renderPromiseStack.addPromise(reRenderPromise);
        thisPromise.then(async (response) => {
            if (action) {
                this.isActionProcessing = false;
            }
            const html = await response.text();
            if (response.headers.get('Content-Type') !== 'application/vnd.live-component+html') {
                this.renderError(html);
                return;
            }
            if (this.renderDebounceTimeout) {
                return;
            }
            const isMostRecent = this.renderPromiseStack.removePromise(thisPromise);
            if (isMostRecent) {
                this._processRerender(html, response, reRenderPromise.unsyncedInputContainer);
            }
        });
    }
    _processRerender(html, response, unsyncedInputContainer) {
        if (this.isWindowUnloaded) {
            return;
        }
        if (response.headers.get('Location')) {
            if (typeof Turbo !== 'undefined') {
                Turbo.visit(response.headers.get('Location'));
            }
            else {
                window.location.href = response.headers.get('Location') || '';
            }
            return;
        }
        if (!this._dispatchEvent('live:render', html, true, true)) {
            return;
        }
        this._onLoadingFinish();
        const modifiedModelValues = {};
        if (unsyncedInputContainer.allMappedFields().size > 0) {
            for (const [modelName] of unsyncedInputContainer.allMappedFields()) {
                modifiedModelValues[modelName] = this.valueStore.get(modelName);
            }
        }
        this._executeMorphdom(html, unsyncedInputContainer.all());
        Object.keys(modifiedModelValues).forEach((modelName) => {
            this.valueStore.set(modelName, modifiedModelValues[modelName]);
        });
    }
    _clearWaitingDebouncedRenders() {
        if (this.renderDebounceTimeout) {
            clearTimeout(this.renderDebounceTimeout);
            this.renderDebounceTimeout = null;
        }
    }
    _onLoadingStart() {
        this._handleLoadingToggle(true);
    }
    _onLoadingFinish() {
        this._handleLoadingToggle(false);
    }
    _handleLoadingToggle(isLoading) {
        this._getLoadingDirectives().forEach(({ element, directives }) => {
            if (isLoading) {
                this._addAttributes(element, ['data-live-is-loading']);
            }
            else {
                this._removeAttributes(element, ['data-live-is-loading']);
            }
            directives.forEach((directive) => {
                this._handleLoadingDirective(element, isLoading, directive);
            });
        });
    }
    _handleLoadingDirective(element, isLoading, directive) {
        const finalAction = parseLoadingAction(directive.action, isLoading);
        let loadingDirective;
        switch (finalAction) {
            case 'show':
                loadingDirective = () => {
                    this._showElement(element);
                };
                break;
            case 'hide':
                loadingDirective = () => this._hideElement(element);
                break;
            case 'addClass':
                loadingDirective = () => this._addClass(element, directive.args);
                break;
            case 'removeClass':
                loadingDirective = () => this._removeClass(element, directive.args);
                break;
            case 'addAttribute':
                loadingDirective = () => this._addAttributes(element, directive.args);
                break;
            case 'removeAttribute':
                loadingDirective = () => this._removeAttributes(element, directive.args);
                break;
            default:
                throw new Error(`Unknown data-loading action "${finalAction}"`);
        }
        let isHandled = false;
        directive.modifiers.forEach((modifier => {
            switch (modifier.name) {
                case 'delay': {
                    if (!isLoading) {
                        break;
                    }
                    const delayLength = modifier.value ? parseInt(modifier.value) : 200;
                    window.setTimeout(() => {
                        if (element.hasAttribute('data-live-is-loading')) {
                            loadingDirective();
                        }
                    }, delayLength);
                    isHandled = true;
                    break;
                }
                default:
                    throw new Error(`Unknown modifier ${modifier.name} used in the loading directive ${directive.getString()}`);
            }
        }));
        if (!isHandled) {
            loadingDirective();
        }
    }
    _getLoadingDirectives() {
        const loadingDirectives = [];
        this.element.querySelectorAll('[data-loading]').forEach((element => {
            if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
                throw new Error('Invalid Element Type');
            }
            const directives = parseDirectives(element.dataset.loading || 'show');
            loadingDirectives.push({
                element,
                directives,
            });
        }));
        return loadingDirectives;
    }
    _showElement(element) {
        element.style.display = 'inline-block';
    }
    _hideElement(element) {
        element.style.display = 'none';
    }
    _addClass(element, classes) {
        element.classList.add(...combineSpacedArray(classes));
    }
    _removeClass(element, classes) {
        element.classList.remove(...combineSpacedArray(classes));
        if (element.classList.length === 0) {
            this._removeAttributes(element, ['class']);
        }
    }
    _addAttributes(element, attributes) {
        attributes.forEach((attribute) => {
            element.setAttribute(attribute, '');
        });
    }
    _removeAttributes(element, attributes) {
        attributes.forEach((attribute) => {
            element.removeAttribute(attribute);
        });
    }
    _willDataFitInUrl(dataJson, params) {
        const urlEncodedJsonData = new URLSearchParams(dataJson).toString();
        return (urlEncodedJsonData + params.toString()).length < 1500;
    }
    _executeMorphdom(newHtml, modifiedElements) {
        const newElement = htmlToElement(newHtml);
        morphdom(this.element, newElement, {
            getNodeKey: (node) => {
                if (!(node instanceof HTMLElement)) {
                    return;
                }
                return node.dataset.liveId;
            },
            onBeforeElUpdated: (fromEl, toEl) => {
                if (!(fromEl instanceof HTMLElement) || !(toEl instanceof HTMLElement)) {
                    return false;
                }
                if (modifiedElements.includes(fromEl)) {
                    return false;
                }
                if (fromEl.isEqualNode(toEl)) {
                    const normalizedFromEl = cloneHTMLElement(fromEl);
                    normalizeAttributesForComparison(normalizedFromEl);
                    const normalizedToEl = cloneHTMLElement(toEl);
                    normalizeAttributesForComparison(normalizedToEl);
                    if (normalizedFromEl.isEqualNode(normalizedToEl)) {
                        return false;
                    }
                }
                const controllerName = fromEl.hasAttribute('data-controller') ? fromEl.getAttribute('data-controller') : null;
                if (controllerName
                    && controllerName.split(' ').indexOf('live') !== -1
                    && fromEl !== this.element
                    && !this._shouldChildLiveElementUpdate(fromEl, toEl)) {
                    return false;
                }
                if (fromEl.hasAttribute('data-live-ignore')) {
                    return false;
                }
                return true;
            },
            onBeforeNodeDiscarded(node) {
                if (!(node instanceof HTMLElement)) {
                    return true;
                }
                if (node.hasAttribute('data-live-ignore')) {
                    return false;
                }
                return true;
            }
        });
        this._exposeOriginalData();
    }
    handleConnectedControllerEvent(event) {
        if (event.target === this.element) {
            return;
        }
        this.childComponentControllers.push(event.detail.controller);
        event.detail.controller.element.addEventListener('live:disconnect', this.handleDisconnectedControllerEvent);
    }
    handleDisconnectedControllerEvent(event) {
        if (event.target === this.element) {
            return;
        }
        const index = this.childComponentControllers.indexOf(event.detail.controller);
        if (index > -1) {
            this.childComponentControllers.splice(index, 1);
        }
    }
    handleUpdateModelEvent(event) {
        if (event.target === this.element) {
            return;
        }
        this._handleChildComponentUpdateModel(event);
    }
    handleInputEvent(event) {
        const target = event.target;
        if (!target) {
            return;
        }
        this._updateModelFromElement(target, 'input');
    }
    handleChangeEvent(event) {
        const target = event.target;
        if (!target) {
            return;
        }
        this._updateModelFromElement(target, 'change');
    }
    _initiatePolling() {
        this._stopAllPolling();
        if (this.element.dataset.poll === undefined) {
            return;
        }
        const rawPollConfig = this.element.dataset.poll;
        const directives = parseDirectives(rawPollConfig || '$render');
        directives.forEach((directive) => {
            let duration = 2000;
            directive.modifiers.forEach((modifier) => {
                switch (modifier.name) {
                    case 'delay':
                        if (modifier.value) {
                            duration = parseInt(modifier.value);
                        }
                        break;
                    default:
                        console.warn(`Unknown modifier "${modifier.name}" in data-poll "${rawPollConfig}".`);
                }
            });
            this._startPoll(directive.action, duration);
        });
    }
    _startPoll(actionName, duration) {
        let callback;
        if (actionName.charAt(0) === '$') {
            callback = () => {
                this[actionName]();
            };
        }
        else {
            callback = () => {
                this._makeRequest(actionName, {});
            };
        }
        const timer = setInterval(() => {
            if (this.renderPromiseStack.countActivePromises() > 0) {
                return;
            }
            callback();
        }, duration);
        this.pollingIntervals.push(timer);
    }
    _dispatchEvent(name, payload = null, canBubble = true, cancelable = false) {
        return this.element.dispatchEvent(new CustomEvent(name, {
            bubbles: canBubble,
            cancelable,
            detail: payload
        }));
    }
    _handleChildComponentUpdateModel(event) {
        const mainModelName = event.detail.modelName;
        const potentialModelNames = [
            { name: mainModelName, required: false },
        ];
        if (event.detail.extraModelName) {
            potentialModelNames.push({ name: event.detail.extraModelName, required: false });
        }
        const modelMapElement = event.target.closest('[data-model-map]');
        if (this.element.contains(modelMapElement)) {
            const directives = parseDirectives(modelMapElement.dataset.modelMap);
            directives.forEach((directive) => {
                let from = null;
                directive.modifiers.forEach((modifier) => {
                    switch (modifier.name) {
                        case 'from':
                            if (!modifier.value) {
                                throw new Error(`The from() modifier requires a model name in data-model-map="${modelMapElement.dataset.modelMap}"`);
                            }
                            from = modifier.value;
                            break;
                        default:
                            console.warn(`Unknown modifier "${modifier.name}" in data-model-map="${modelMapElement.dataset.modelMap}".`);
                    }
                });
                if (!from) {
                    throw new Error(`Missing from() modifier in data-model-map="${modelMapElement.dataset.modelMap}". The format should be "from(childModelName)|parentModelName"`);
                }
                if (from !== mainModelName) {
                    return;
                }
                potentialModelNames.push({ name: directive.action, required: true });
            });
        }
        potentialModelNames.reverse();
        let foundModelName = null;
        potentialModelNames.forEach((potentialModel) => {
            if (foundModelName) {
                return;
            }
            if (this.valueStore.hasAtTopLevel(potentialModel.name)) {
                foundModelName = potentialModel.name;
                return;
            }
            if (potentialModel.required) {
                throw new Error(`The model name "${potentialModel.name}" does not exist! Found in data-model-map="from(${mainModelName})|${potentialModel.name}"`);
            }
        });
        if (!foundModelName) {
            return;
        }
        this.$updateModel(foundModelName, event.detail.value, false, null, {
            dispatch: false
        });
    }
    _shouldChildLiveElementUpdate(fromEl, toEl) {
        if (!fromEl.dataset.originalData) {
            throw new Error('Missing From Element originalData');
        }
        if (!fromEl.dataset.liveDataValue) {
            throw new Error('Missing From Element liveDataValue');
        }
        if (!toEl.dataset.liveDataValue) {
            throw new Error('Missing To Element liveDataValue');
        }
        return haveRenderedValuesChanged(fromEl.dataset.originalData, fromEl.dataset.liveDataValue, toEl.dataset.liveDataValue);
    }
    _exposeOriginalData() {
        if (!(this.element instanceof HTMLElement)) {
            throw new Error('Invalid Element Type');
        }
        this.element.dataset.originalData = this.originalDataJSON;
    }
    _startAttributesMutationObserver() {
        if (!(this.element instanceof HTMLElement)) {
            throw new Error('Invalid Element Type');
        }
        const element = this.element;
        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    if (!element.dataset.originalData) {
                        this.originalDataJSON = this.valueStore.asJson();
                        this._exposeOriginalData();
                    }
                    this._initiatePolling();
                }
            });
        });
        this.mutationObserver.observe(this.element, {
            attributes: true
        });
    }
    getDefaultDebounce() {
        return this.hasDebounceValue ? this.debounceValue : DEFAULT_DEBOUNCE;
    }
    _stopAllPolling() {
        this.pollingIntervals.forEach((interval) => {
            clearInterval(interval);
        });
    }
    async renderError(html) {
        let modal = document.getElementById('live-component-error');
        if (modal) {
            modal.innerHTML = '';
        }
        else {
            modal = document.createElement('div');
            modal.id = 'live-component-error';
            modal.style.padding = '50px';
            modal.style.backgroundColor = 'rgba(0, 0, 0, .5)';
            modal.style.zIndex = '100000';
            modal.style.position = 'fixed';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
        }
        const iframe = document.createElement('iframe');
        iframe.style.borderRadius = '5px';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        modal.appendChild(iframe);
        document.body.prepend(modal);
        document.body.style.overflow = 'hidden';
        if (iframe.contentWindow) {
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(html);
            iframe.contentWindow.document.close();
        }
        const closeModal = (modal) => {
            if (modal) {
                modal.outerHTML = '';
            }
            document.body.style.overflow = 'visible';
        };
        modal.addEventListener('click', () => closeModal(modal));
        modal.setAttribute('tabindex', '0');
        modal.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeModal(modal);
            }
        });
        modal.focus();
    }
}
default_1.values = {
    url: String,
    data: Object,
    csrf: String,
    debounce: Number,
};
class PromiseStack {
    constructor() {
        _PromiseStack_instances.add(this);
        this.stack = [];
    }
    addPromise(reRenderPromise) {
        this.stack.push(reRenderPromise);
    }
    removePromise(promise) {
        const index = __classPrivateFieldGet(this, _PromiseStack_instances, "m", _PromiseStack_findPromiseIndex).call(this, promise);
        if (index === -1) {
            return false;
        }
        const isMostRecent = this.stack.length === (index + 1);
        this.stack.splice(0, index + 1);
        return isMostRecent;
    }
    countActivePromises() {
        return this.stack.length;
    }
    addModifiedElement(element, modelName = null) {
        this.stack.forEach((reRenderPromise) => {
            reRenderPromise.addModifiedElement(element, modelName);
        });
    }
}
_PromiseStack_instances = new WeakSet(), _PromiseStack_findPromiseIndex = function _PromiseStack_findPromiseIndex(promise) {
    return this.stack.findIndex((item) => item.promise === promise);
};
class ReRenderPromise {
    constructor(promise, unsyncedInputContainer) {
        this.promise = promise;
        this.unsyncedInputContainer = unsyncedInputContainer;
    }
    addModifiedElement(element, modelName = null) {
        this.unsyncedInputContainer.add(element, modelName);
    }
}
const parseLoadingAction = function (action, isLoading) {
    switch (action) {
        case 'show':
            return isLoading ? 'show' : 'hide';
        case 'hide':
            return isLoading ? 'hide' : 'show';
        case 'addClass':
            return isLoading ? 'addClass' : 'removeClass';
        case 'removeClass':
            return isLoading ? 'removeClass' : 'addClass';
        case 'addAttribute':
            return isLoading ? 'addAttribute' : 'removeAttribute';
        case 'removeAttribute':
            return isLoading ? 'removeAttribute' : 'addAttribute';
    }
    throw new Error(`Unknown data-loading action "${action}"`);
};

export { default_1 as default };

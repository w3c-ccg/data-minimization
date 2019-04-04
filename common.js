/* globals omitTerms, respecConfig, $, require */
/* exported linkCrossReferences, restrictReferences, fixIncludes */

var ccg = {
  // Add as the respecConfig localBiblio variable
  // Extend or override global respec references
  localBiblio: {
    "WEB-SEQ": {
        title: "Web Sequence Diagrams",
        href: "https://www.websequencediagrams.com/",
        authors: []
    },
    "IDENTITY-MIXER": {
        title: "Identity Mixer",
        href: "https://www.zurich.ibm.com/identity_mixer/",
        authors: []
    },
    "VC-CODE": {
        title: "Verifiable Credentials Code",
        href: "https://github.com/hyperledger/indy-sdk/blob/master/libindy/src/api/anoncreds.rs",
        authors: []
    },
    "VC-EXAMPLE": {
        title: "Verifiable Credentials Example Usage in Python",
        href: "https://github.com/hyperledger/indy-sdk/blob/master/samples/python/src/anoncreds.py",
        authors: []
    },
    "ANON-CRED": {
        title: "An Efficient System for Non-transferable Anonymous Credentials with Optional Anonymity Revocation",
        href: "http://www.cs.ru.nl/~jhh/pub/secsem/camenish2001idemix-clean.pdf",
        authors: ["Lysyanskaya Camenisch"]
    },
    "TERMINOLOGY": {
        title: "A terminology for talking about privacy by data minimization: Anonymity, Unlinkability, Undetectability, Unobservability, Pseudonymity, and Identity Management",
        date: "2010",
        href: "https://www.researchgate.net/publication/234720523_A_terminology_for_talking_about_privacy_by_data_minimization_Anonymity_Unlinkability_Undetectability_Unobservability_Pseudonymity_and_Identity_Management",
        authors: ["Pfitzmann, Hansen"]
    },
    "RFC6973": {
        title: "This document focuses on introducing terms used to describe privacy properties that support data minimization",
        href: "https://tools.ietf.org/html/rfc6973",
        date: "2013",
        status: "Internet-Draft",
        publisher: "IETF",
        authors: ["Cooper, Tschofenig", "Aboba, Peterson", "Morris, Hansen", "Smith, Janet."]
    },
    "PRIVACY-TERMINOLOGY": {
        title: "Privacy Terminology and Concepts",
        href: "https://tools.ietf.org/html/draft-iab-privacy-terminology-01",
        status: "Internet-Draft",
        publisher: "IETF Network Working Group",
        date: "2012",
        authors: ["Hansen, Tschofenig", "Smith, Cooper"]
    },
    "REDACTION": {
        title: "Redaction Signature Suite",
        href: "https://w3c-dvcg.github.io/lds-redaction2016/",
        date: "2016",
        authors: ["Dave Longley", "Manu Sporny"],
        status: "CG-DRAFT"
    }
  }
};



// We should be able to remove terms that are not actually
// referenced from the common definitions
//
// the termlist is in a block of class "termlist", so make sure that
// has an ID and put that ID into the termLists array so we can
// interrogate all of the included termlists later.
var termNames = [] ;
var termLists = [] ;
var termsReferencedByTerms = [] ;

function restrictReferences(utils, content) {
    "use strict";
    var base = document.createElement("div");
    base.innerHTML = content;

    // New new logic:
    //
    // 1. build a list of all term-internal references
    // 2. When ready to process, for each reference INTO the terms,
    // remove any terms they reference from the termNames array too.
    $.each(base.querySelectorAll("dfn"), function(i, item) {
        var $t = $(item) ;
        var titles = $t.getDfnTitles();
        var dropit = false;
        // do we have an omitTerms
        if (window.hasOwnProperty("omitTerms")) {
            // search for a match
            $.each(omitTerms, function(j, term) {
                if (titles.indexOf(term) !== -1) {
                    dropit = true;
                }
            });
        }
        // do we have an includeTerms
        if (window.hasOwnProperty("includeTerms")) {
            var found = false;
            // search for a match
            $.each(includeTerms, function(j, term) {
                if (titles.indexOf(term) !== -1) {
                    found = true;
                }
            });
            if (!found) {
                dropit = true;
            }
        }
        if (dropit) {
            $t.parent().next().remove();
            $t.parent().remove();
        } else {
            var n = $t.makeID("dfn", titles[0]);
            if (n) {
                termNames[n] = $t.parent() ;
            }
        }
    });

    var $container = $(".termlist",base) ;
    var containerID = $container.makeID("", "terms") ;
    termLists.push(containerID) ;

    return (base.innerHTML);
}
// add a handler to come in after all the definitions are resolved
//
// New logic: If the reference is within a 'dl' element of
// class 'termlist', and if the target of that reference is
// also within a 'dl' element of class 'termlist', then
// consider it an internal reference and ignore it.

require(["core/pubsubhub"], function(respecEvents) {
    "use strict";
    respecEvents.sub('end', function(message) {
        if (message === 'core/link-to-dfn') {
            // all definitions are linked; find any internal references
            $(".termlist a.internalDFN").each(function() {
                var $r = $(this);
                var id = $r.attr('href');
                var idref = id.replace(/^#/,"") ;
                if (termNames[idref]) {
                    // this is a reference to another term
                    // what is the idref of THIS term?
                    var $def = $r.closest('dd') ;
                    if ($def.length) {
                        var $p = $def.prev('dt').find('dfn') ;
                        var tid = $p.attr('id') ;
                        if (tid) {
                            if (termsReferencedByTerms[tid]) {
                                termsReferencedByTerms[tid].push(idref);
                            } else {
                                termsReferencedByTerms[tid] = [] ;
                                termsReferencedByTerms[tid].push(idref);
                            }
                        }
                    }
                }
            }) ;

            // clearRefs is recursive.  Walk down the tree of
            // references to ensure that all references are resolved.
            var clearRefs = function(theTerm) {
                if ( termsReferencedByTerms[theTerm] ) {
                    $.each(termsReferencedByTerms[theTerm], function(i, item) {
                        if (termNames[item]) {
                            delete termNames[item];
                            clearRefs(item);
                        }
                    });
                }
                // make sure this term doesn't get removed
                if (termNames[theTerm]) {
                    delete termNames[theTerm];
                }
            };

            // now termsReferencedByTerms has ALL terms that
            // reference other terms, and a list of the
            // terms that they reference
            $("a.internalDFN").each(function () {
                var $item = $(this) ;
                var t = $item.attr('href');
                var r = t.replace(/^#/,"") ;
                // if the item is outside the term list
                if ( ! $item.closest('dl.termlist').length ) {
                    clearRefs(r);
                }
            });

            // delete any terms that were not referenced.
            Object.keys(termNames).forEach(function(term) {
                var $p = $("#"+term) ;
                if ($p) {
                    var tList = $p.getDfnTitles();
                    $p.parent().next().remove();
                    $p.parent().remove() ;
                    tList.forEach(function( item ) {
                        if (respecConfig.definitionMap[item]) {
                            delete respecConfig.definitionMap[item];
                        }
                    });
                }
            });
        }
    });
});

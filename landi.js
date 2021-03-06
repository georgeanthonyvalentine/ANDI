//==========================================//
//lANDI: links ANDI 						//
//Created By Social Security Administration //
//==========================================//
function init_module(){

var landiVersionNumber = "6.2.2";

//create lANDI instance
var lANDI = new AndiModule(landiVersionNumber,"l");

//This function updates the Active Element Inspector when mouseover/hover is on a given to a highlighted element.
//Holding the shift key will prevent inspection from changing.
AndiModule.andiElementHoverability = function(event){
	if(!event.shiftKey) //check for holding shift key
		lANDI.inspect(this);
};
//This function updates the Active Element Inspector when focus is given to a highlighted element.
AndiModule.andiElementFocusability = function(){
	andiLaser.eraseLaser();
	lANDI.inspect(this);
	andiResetter.resizeHeights();
};

//This object class is used to store data about each link. Object instances will be placed into an array.
function Link(href, nameDescription, index, alerts, target, linkPurpose, ambiguousIndex, element){
	this.href = href;
	this.nameDescription = nameDescription;
	this.index = index;
	this.alerts = alerts;
	this.target = target;
	this.linkPurpose = linkPurpose;
	this.ambiguousIndex = undefined;
	this.element = element;
}

//This object class is used to store data about each button. Object instances will be placed into an array.
function Button(nameDescription, index, alerts, accesskey, nonUniqueIndex, element){
	this.nameDescription = nameDescription;
	this.index = index;
	this.alerts = alerts;
	this.accesskey = accesskey;
	this.nonUniqueIndex = undefined;
	this.element = element;
}

//This object class is used to keep track of the links on the page
function Links(){
	this.list = [];
	this.count = 0;
	this.ambiguousIndex = 0;
	this.ambiguousCount = 0;
	this.internalCount = 0;
	this.externalCount = 0;
}

//This object class is used to keep track of the buttons on the page
function Buttons(){
	this.list = [];
	this.nonUniqueIndex = 0;
	this.count = 0;
	this.nonUniqueCount = 0;
}

//Alert icons for the links list table
var alertIcons = new function(){
	this.danger_noAccessibleName = makeIcon("danger","No accessible name");
	this.danger_anchorTargetNotFound = makeIcon("warning","In-page anchor target not found");
	this.warning_ambiguous = makeIcon("warning","Ambiguous: same name, different href");
	this.caution_ambiguous = makeIcon("caution","Ambiguous: same name, different href");
	this.caution_vagueText = makeIcon("caution","Vague: does not identify link purpose.");
	this.warning_nonUnique = makeIcon("warning","Non-Unique: same name as another button");
	this.warning_tabOrder = makeIcon("warning","Element not in tab order");
	
	function makeIcon(alertLevel, titleText){
		//The sortPriority number allows alert icon sorting
		var sortPriority = "3"; //default to caution
		if(alertLevel=="warning")
			sortPriority = "2";
		else if(alertLevel=="danger")
			sortPriority = "1";
		return "<img src='"+icons_url+alertLevel+".png' alt='"+alertLevel+"' title='Accessibility Alert: "+titleText+"' /><i>"+sortPriority+" </i>";
	};
};

//AndiModule.activeActionButtons
if($.isEmptyObject(AndiModule.activeActionButtons)){
	$.extend(AndiModule.activeActionButtons,{linksMode:true});
	$.extend(AndiModule.activeActionButtons,{linksList:false});
	$.extend(AndiModule.activeActionButtons,{highlightAmbiguousLinks:false});
	$.extend(AndiModule.activeActionButtons,{buttonsMode:false});
	$.extend(AndiModule.activeActionButtons,{buttonsList:false});
	$.extend(AndiModule.activeActionButtons,{highlightNonUniqueButtons:false});
}

lANDI.viewList_tableReady = false;

//This function will analyze the test page for link related markup relating to accessibility
lANDI.analyze = function(){
	
	lANDI.links = new Links();
	lANDI.buttons = new Buttons();
	
	//Variables used to build the links/buttons list array.
	var href, nameDescription, alerts, target, linkPurpose, accesskey, alertIcon, alertObject, relatedElement, nonUniqueIndex, ambiguousIndex;
	
	//Loop through every visible element and run tests
	$(TestPageData.allVisibleElements).each(function(){
		//ANALYZE LINKS
		if($(this).is("a,[role=link]")){
			if(!andiCheck.isThisElementDisabled(this)){
				
				lANDI.links.count++;
			
				if(AndiModule.activeActionButtons.linksMode){
					andiData = new AndiData($(this));
					andiData.grabComponents($(this));
					
					if($(this).is("a")){
						
						nameDescription = andiData.preCalculateNameDescription();
						href = normalizeHref(this);
						alerts = "";
						linkPurpose = ""; //i=internal, e=external
						target = $.trim($(this).attr("target"));
						alertIcon = "";
						alertObject = "";
						ambiguousIndex = undefined;
						
						if(isLinkKeyboardAccessible(href, this)){
							if(nameDescription){
								
								ambiguousIndex = scanForAmbiguity(nameDescription, href);
								
								determineLinkPurpose(href);

								testForVagueLinkText(nameDescription);

								if(!alerts) //Add this for sorting purposes
									alerts = "<i>4</i>";
							}
							else{
								//No accessible name or description
								alerts = alertIcons.danger_noAccessibleName;
								nameDescription = "<span class='ANDI508-display-danger'>No Accessible Name</span>";
							}
							
							if(href){
								//create Link object and add to array
								lANDI.links.list.push(
								new Link(href,
									nameDescription,
									andiData.andiElementIndex,
									alerts,
									target,
									linkPurpose,
									ambiguousIndex,
									this));
							}
						}
					}
					else{//role=link
						isElementInTabOrder(this, "link");
					}
					
					andiCheck.commonFocusableElementChecks(andiData,$(this));

					andiData.attachDataToElement($(this));
				}
			}
		}
		//ANALYZE BUTTONS
		else if($(this).is("button,:button,:submit,:reset,:image,[role=button]")){
			
			if(!andiCheck.isThisElementDisabled(this)){
				lANDI.buttons.count++;
				
				if(AndiModule.activeActionButtons.buttonsMode){
					andiData = new AndiData($(this));
					andiData.grabComponents($(this));
						
					nameDescription = andiData.preCalculateNameDescription();
					alerts = "";
					alertIcon = "";
					alertObject = "";
					
					if(andiData.addOnProperties.accesskey)
						accesskey = andiData.addOnProperties.accesskey;
					else
						accesskey = "";
					
					if(nameDescription){
						//Seach through Buttons Array for same name
						nonUniqueIndex = scanForNonUniqueness(nameDescription);
						
						//role=button
						if($(this).is("[role=button]")){
							isElementInTabOrder(this,"button");
						}
						
						if(!alerts)
							//Add this for sorting purposes
							alerts = "<i>4</i>";
					}
					else{
						//No accessible name or description
						alerts = alertIcons.danger_noAccessibleName;
						nameDescription = "<span class='ANDI508-display-danger'>No Accessible Name</span>";
					}

					andiCheck.commonFocusableElementChecks(andiData,$(this));
					andiData.attachDataToElement($(this));
					
					//create Button object and add to array
					lANDI.buttons.list.push(new Button(nameDescription,andiData.andiElementIndex,alerts,accesskey,nonUniqueIndex,this));
				}
			}
		}
	});
	
	//Detect disabled links or buttons
	if(AndiModule.activeActionButtons.linksMode){
		andiCheck.areThereDisabledElements("links");
	}
	else if(AndiModule.activeActionButtons.buttonsMode){
		andiCheck.areThereDisabledElements("buttons");
	}
	
	//This function gets the href 
	//if href length is greater than 1 and last char is a slash
	//This elimates false positives during comparisons since with or without slash is essentially the same
	function normalizeHref(element){
		var href = $.trim($(element).attr("href"));
		if(href.length > 1 && href.charAt(href.length - 1) == "/")
			href = href.slice(0, -1);
		return href;
	}
	
	//This function returns true if the link is keyboard accessible
	function isLinkKeyboardAccessible(href, element){
		if(!href && !!$(element).prop("tabIndex")){
			//There is no href and no tabindex
			if(!element.id && !$(element).attr("name")){
				if(element.onclick === null && $._data(element, "events").click === undefined)
					//Link has no href, tabindex, or id, and no click event detected
					andiAlerter.throwAlert(alert_0165);
				else //Link is clickable but not keyboard accessible
					andiAlerter.throwAlert(alert_0164);
				return false;
			}
		}
		return true;
	}
	
	//This function will seach through Links Array for same name different href
	function scanForAmbiguity(nameDescription, href){
		var regEx = /^https?:\/\//; //Strip out the http:// or https:// from the compare
		
		for(var x=0; x<lANDI.links.list.length; x++){
			if(nameDescription.toLowerCase() == lANDI.links.list[x].nameDescription.toLowerCase()){ //nameDescription match
				
				if(href.toLowerCase().replace(regEx,"") != lANDI.links.list[x].href.toLowerCase().replace(regEx,"")){ //href doesn't match, throw alert
					
					//Determine which alert level should be thrown
					if(href.charAt(0) == "#" || lANDI.links.list[x].href.charAt(0) == "#"){
						//One link is internal
						alertIcon = alertIcons.caution_ambiguous;
						alertObject = alert_0162;
					}
					else{
						alertIcon = alertIcons.warning_ambiguous;
						alertObject = alert_0161;
					}
					
					//Throw the alert
					if(!lANDI.links.list[x].alerts.includes(alertIcon)){
						//Throw alert on first instance only one time
						andiAlerter.throwAlertOnOtherElement(lANDI.links.list[x].index, alertObject);
						lANDI.links.list[x].alerts = alertIcon;
					}
					
					//Set the ambiguousIndex
					var i; //will store the ambiguousIndex for this match
					//Does the first instance already have an ambiguousIndex?
					relatedElement = $(lANDI.links.list[x].element);
					if(lANDI.links.list[x].ambiguousIndex){
						//Yes. Copy the ambiguousIndex from the first instance
						i = lANDI.links.list[x].ambiguousIndex;
						lANDI.links.ambiguousCount++;
					}
					else{
						//No. increment ambiguousIndex and add it to the first instance.
						lANDI.links.ambiguousCount = lANDI.links.ambiguousCount + 2;
						lANDI.links.ambiguousIndex++;
						i = lANDI.links.ambiguousIndex;
						lANDI.links.list[x].ambiguousIndex = i;
						$(relatedElement).addClass("lANDI508-ambiguous");
					}

					$(this).addClass("lANDI508-ambiguous");
					alerts += alertIcon;
					andiAlerter.throwAlert(alertObject);
					return i;//prevents alert from being thrown more than once on an element
				}
			}
		}
		return false;
	}
	
	//This function searches the button list for non-uniqueness.
	function scanForNonUniqueness(nameDescription){
		for(var y=0; y<lANDI.buttons.list.length; y++){
			if(nameDescription.toLowerCase() == lANDI.buttons.list[y].nameDescription.toLowerCase()){ //nameDescription matches
				
				alertIcon = alertIcons.warning_nonUnique;
				alertObject = alert_0200;
				
				//Throw the alert
				if(!lANDI.buttons.list[y].alerts.includes(alertIcon)){
					//Throw alert on first instance only one time
					andiAlerter.throwAlertOnOtherElement(lANDI.buttons.list[y].index,alertObject);
					lANDI.buttons.list[y].alerts = alertIcon;
				}
			
				//Set the nonUniqueIndex
				var m; //will store the nonUniqueIndex for this match
				//Does the first instance already have a nonUniqueIndex?
				relatedElement = $(lANDI.buttons.list[y].element);
				if(lANDI.buttons.list[y].nonUniqueIndex){
					//Yes. Copy the nonUniqueIndex from the first instance
					m = lANDI.buttons.list[y].nonUniqueIndex;
					lANDI.buttons.nonUniqueCount++;
				}
				else{
					//No. increment nonUniqueIndex and add it to the first instance.
					lANDI.buttons.nonUniqueCount = lANDI.buttons.nonUniqueCount + 2;
					lANDI.buttons.nonUniqueIndex++;
					m = lANDI.buttons.nonUniqueIndex;
					lANDI.buttons.list[y].nonUniqueIndex = m;
					$(relatedElement).addClass("lANDI508-ambiguous");
				}

				$(this).addClass("lANDI508-ambiguous");
				alerts += alertIcon;
				andiAlerter.throwAlert(alertObject);
				return m;//prevents alert from being thrown more than once on an element
			}
		}
		return false;
	}
	
	//This function searches for anchor target if href is internal and greater than 1 character e.g. href="#x"
	function determineLinkPurpose(href){
		if(href.charAt(0) == "#" && href.length > 1){
			var idRef = href.toLowerCase().slice(1);
			if(searchForAnchorTarget(idRef)){
				if(this.onclick === null && $._data(this, 'events').click === undefined){//no click events
					//Throw Alert, Anchor Target not found
					alerts += alertIcons.danger_anchorTargetNotFound;
					andiAlerter.throwAlert(alert_0069, [idRef]);
				}
			}
			else{//link is internal and anchor target found
				lANDI.links.internalCount++;
				linkPurpose = "i";
				$(this).addClass("lANDI508-internalLink");
			}
		}
		else if(href.charAt(0) != "#" && !href.toLowerCase().substring(0, 11) == "javascript:"){//this is an external link
			lANDI.links.externalCount++;
			linkPurpose = "e";
			$(this).addClass("lANDI508-externalLink");
		}
		
		//This function searches allIds list to check if anchor target exists
		function searchForAnchorTarget(idRef){
			for(var z=0; z<testPageData.allIds.length; z++){
				if(testPageData.allIds[z].id.toString().toLowerCase() == idRef)
					return false;
			}
			return true;
		}
	}
	
	//This function checks the link text for vagueness
	function testForVagueLinkText(nameDescription){
		var regEx = /^(click here|here|link|edit|select|more|more info|more information|go)$/g;
		if(regEx.test(nameDescription.toLowerCase())){
			alerts += alertIcons.caution_vagueText;
			andiAlerter.throwAlert(alert_0163);
		}
	}
	
	//This function determines if an element[role] is in tab order
	function isElementInTabOrder(element, role){
		if(!!$(element).prop("tabIndex") && !$(element).is(":tabbable")){//Element is not tabbable and has no tabindex
			//Throw Alert: Element with role=link|button not in tab order
			alerts += alertIcons.warning_tabOrder;
			andiAlerter.throwAlert(alert_0125, [role]);
		}
	}
};

//This function adds the finishing touches and functionality to ANDI's display once it's done scanning the page.
lANDI.results = function(){

	//Add Module Mode Buttons
	var moduleModeButtons = "<button id='ANDI508-linksMode-button' class='lANDI508-mode' aria-label='"+lANDI.links.count+" Links' aria-selected='false'>"+lANDI.links.count+" links</button>"+
		"<button id='ANDI508-buttonsMode-button' class='lANDI508-mode' aria-label='"+lANDI.buttons.count+" Buttons' aria-selected='false'>"+lANDI.buttons.count+" buttons</button>";
	$("#ANDI508-module-actions").html(moduleModeButtons);
	
	//Define lANDI mode buttons
	$("#ANDI508-linksMode-button").click(function(){
		andiResetter.softReset($("#ANDI508-testPage"));
		AndiModule.activeActionButtons.linksMode = true;
		AndiModule.activeActionButtons.buttonsMode = false;
		AndiModule.launchModule("l");
	});
	$("#ANDI508-buttonsMode-button").click(function(){
		andiResetter.softReset($("#ANDI508-testPage"));
		AndiModule.activeActionButtons.linksMode = false;
		AndiModule.activeActionButtons.buttonsMode = true;
		AndiModule.launchModule("l");
	});

	if(lANDI.links.count > 0 || lANDI.buttons.count > 0){
		//Links or buttons were found
		
		if(AndiModule.activeActionButtons.linksMode){
			andiBar.updateResultsSummary("Links Found: "+lANDI.links.count);
			
			$("#ANDI508-linksMode-button").attr("aria-selected","true").addClass("ANDI508-module-action-active");
			
			if(lANDI.links.count > 0){
				
				if(lANDI.links.ambiguousIndex > 0){
					//highlightAmbiguousLinks button
					$("#ANDI508-module-actions").append("<span class='ANDI508-module-actions-spacer'>|</span> <button id='ANDI508-highlightAmbiguousLinks-button' aria-label='Highlight "+lANDI.links.ambiguousCount+" Ambiguous Links' aria-pressed='false'>"+lANDI.links.ambiguousCount+" ambiguous links"+findIcon+"</button>");
				
					//Ambiguous Links Button
					$("#ANDI508-highlightAmbiguousLinks-button").click(function(){
						var testPage = $("#ANDI508-testPage");
						if(!$(testPage).hasClass("lANDI508-highlightAmbiguous")){
							//On
							$("#lANDI508-listLinks-tab-all").click();
							$("#ANDI508-testPage")
								//.removeClass("lANDI508-highlightInternal lANDI508-highlightExternal")
								.addClass("lANDI508-highlightAmbiguous");
							andiOverlay.overlayButton_on("find",$(this));
							AndiModule.activeActionButtons.highlightAmbiguousLinks = true;
						}
						else{
							//Off
							$("#ANDI508-testPage").removeClass("lANDI508-highlightAmbiguous");
							andiOverlay.overlayButton_off("find",$(this));
							AndiModule.activeActionButtons.highlightAmbiguousLinks = false;
						}
						andiResetter.resizeHeights();
						return false;
					});
				}
				
				$("#ANDI508-additionalPageResults").append("<button id='ANDI508-viewLinksList-button' class='ANDI508-viewOtherResults-button' aria-expanded='false'>"+listIcon+"view links list</button>");

				//Links List Button
				$("#ANDI508-viewLinksList-button").click(function(){
					if(!lANDI.viewList_tableReady){
						lANDI.viewList_buildTable("links");
						lANDI.viewList_attachEvents();
						lANDI.viewList_attachEvents_links();
						lANDI.viewList_tableReady = true;
					}
					lANDI.viewList_toggle("links", this);
					andiResetter.resizeHeights();
					return false;
				});

				//Show Startup Summary
				if(!andiBar.focusIsOnInspectableElement()){
					andiBar.showElementControls();
					andiBar.showStartUpSummary("Discover accessibility markup for <span class='ANDI508-module-name-l'>links</span> by tabbing to or hovering over the highlighted elements.",true,"link");
				}
				
				andiAlerter.updateAlertList();
				
				//Click previously active buttons
				if(AndiModule.activeActionButtons.linksList)
					$("#ANDI508-viewLinksList-button").click();
				if(AndiModule.activeActionButtons.highlightAmbiguousLinks)
					$("#ANDI508-highlightAmbiguousLinks-button").click();
			}
			else{//page has no links, but has buttons
				andiBar.updateResultsSummary("Links Found: 0");
		
				//No links or buttons were found
				andiBar.hideElementControls();
				if(testPageData.numberOfAccessibilityAlertsFound === 0){
					//No Alerts
					andiBar.showStartUpSummary("No <span class='ANDI508-module-name-l'>links</span> were found.",false);
				}
				else{
					//Alerts were found
					andiBar.showStartUpSummary("No <span class='ANDI508-module-name-l'>links</span> were found, however there are some accessibility alerts.",true);
					andiAlerter.updateAlertList();
				}
			}
		}
		else if(AndiModule.activeActionButtons.buttonsMode){
			andiBar.updateResultsSummary("Buttons Found: "+lANDI.buttons.count);
			
			$("#ANDI508-buttonsMode-button").attr("aria-selected","true").addClass("ANDI508-module-action-active");
			
			if(lANDI.buttons.count > 0){
				
				if(lANDI.buttons.nonUniqueCount > 0){
					//highlightNonUniqueButtons
					$("#ANDI508-module-actions").append("<span class='ANDI508-module-actions-spacer'>|</span> <button id='ANDI508-highlightNonUniqueButtons-button' aria-label='Highlight "+lANDI.buttons.nonUniqueCount+" Non-Unique Buttons' aria-pressed='false'>"+lANDI.buttons.nonUniqueCount+" non-unique buttons"+findIcon+"</button>");
				
					//highlightNonUniqueButtons Button
					$("#ANDI508-highlightNonUniqueButtons-button").click(function(){
						var testPage = $("#ANDI508-testPage");
						if(!$(testPage).hasClass("lANDI508-highlightAmbiguous")){
							//On
							$("#lANDI508-listButtons-tab-all").click();
							$("#ANDI508-testPage").addClass("lANDI508-highlightAmbiguous");
							andiOverlay.overlayButton_on("find",$(this));
							AndiModule.activeActionButtons.highlightNonUniqueButtons = true;
						}
						else{
							//Off
							$("#ANDI508-testPage").removeClass("lANDI508-highlightAmbiguous");
							andiOverlay.overlayButton_off("find",$(this));
							AndiModule.activeActionButtons.highlightNonUniqueButtons = false;
						}
						andiResetter.resizeHeights();
						return false;
					});
				}
				
				$("#ANDI508-additionalPageResults").append("<button id='ANDI508-viewButtonsList-button' class='ANDI508-viewOtherResults-button' aria-label='View Buttons List' aria-expanded='false'>"+listIcon+"view buttons list</button>");
				
				//View Button List Button
				$("#ANDI508-viewButtonsList-button").click(function(){
					if(!lANDI.viewList_tableReady){
						lANDI.viewList_buildTable("buttons");
						lANDI.viewList_attachEvents();
						lANDI.viewList_attachEvents_buttons();
						lANDI.viewList_tableReady = true;
					}
					lANDI.viewList_toggle("buttons", this);
					andiResetter.resizeHeights();
					return false;
				});
				
				//Show Startup Summary
				if(!andiBar.focusIsOnInspectableElement()){
					andiBar.showElementControls();
					andiBar.showStartUpSummary("Discover accessibility markup for <span class='ANDI508-module-name-l'>buttons</span> by tabbing to or hovering over the highlighted elements.",true,"button");
				}
				
				andiAlerter.updateAlertList();
				
				//Click previously active buttons
				if(AndiModule.activeActionButtons.buttonsList)
					$("#ANDI508-viewButtonsList-button").click();
				if(AndiModule.activeActionButtons.highlightNonUniqueButtons)
					$("#ANDI508-highlightNonUniqueButtons-button").click();
			}
			else{
				//page has no buttons, but has links
				andiBar.updateResultsSummary("Buttons Found: 0");
		
				//No links or buttons were found
				andiBar.hideElementControls();
				if(testPageData.numberOfAccessibilityAlertsFound === 0){
					//No Alerts
					andiBar.showStartUpSummary("No <span class='ANDI508-module-name-l'>buttons</span> were found.",false);
				}
				else{
					//Alerts were found
					andiBar.showStartUpSummary("No <span class='ANDI508-module-name-l'>buttons</span> were found, however there are some accessibility alerts.",true);
					andiAlerter.updateAlertList();
				}
			}
		}
	}
	else{
		andiBar.updateResultsSummary("Links Found: 0, Buttons Found: 0");
		
		//No links or buttons were found
		andiBar.hideElementControls();
		if(testPageData.numberOfAccessibilityAlertsFound === 0){
			//No Alerts
			andiBar.showStartUpSummary("No <span class='ANDI508-module-name-l'>links</span> or <span class='ANDI508-module-name-l'>buttons</span> were found.",false);
		}
		else{
			//Alerts were found
			andiBar.showStartUpSummary("No <span class='ANDI508-module-name-l'>links</span> or <span class='ANDI508-module-name-l'>buttons</span> were found, <br />however there are some accessibility alerts.",true);
			andiAlerter.updateAlertList();
		}
	}
	
	$("#ANDI508").focus();
};

//This function will update the info in the Active Element Inspection.
//Should be called after the mouse hover or focus in event.
lANDI.inspect = function(element){
	if($(element).hasClass("ANDI508-element")){
		
		//Highlight the row in the links list that associates with this element
		var index = $(element).attr("data-ANDI508-index");
		lANDI.viewList_rowHighlight(index);
		
		andiBar.prepareActiveElementInspection(element);
		
		var elementData = $(element).data("ANDI508");
		
		var additionalComponents = [
			$(element).attr("href"),
			$(element).attr("rel"),
			$(element).attr("download"),
			$(element).attr("media"),
			$(element).attr("target"),
			$(element).attr("type")
		];
		
		andiBar.displayTable(elementData,
			[
				["aria-labelledby", elementData.ariaLabelledby],
				["aria-label", elementData.ariaLabel],
				["innerText", elementData.innerText],
				["child", elementData.subtree],
				["imageSrc", elementData.imageSrc],
				["aria-describedby", elementData.ariaDescribedby],
				["title", elementData.title],
				["href", additionalComponents[0]]
			],
			[
				["rel", additionalComponents[1]],
				["download", additionalComponents[2]],
				["media", additionalComponents[3]],
				["target", additionalComponents[4]],
				["type", additionalComponents[5]],
				["aria-controls", elementData.addOnProperties.ariaControls],
				["aria-expanded", elementData.addOnProperties.ariaExpanded],
				["aria-haspopup", elementData.addOnProperties.ariaHaspopup],
				["aria-hidden", elementData.addOnProperties.ariaHidden],
				["aria-pressed", elementData.addOnProperties.ariaPressed],
				["aria-sort", elementData.addOnProperties.ariaSort],
				["tabindex", elementData.addOnProperties.tabindex],
				["accesskey", elementData.addOnProperties.accesskey]
			],
			additionalComponents
		);
		
		andiBar.displayOutput(elementData);	
	}
};

//This function builds the table for the view list
lANDI.viewList_buildTable = function(mode){
	var tableHTML = "";
	var rowClasses, tabsHTML, prevNextButtons;
	var appendHTML = "<div id='lANDI508-viewList' class='ANDI508-viewOtherResults-expanded' style='display:none;'><div id='lANDI508-viewList-tabs'>";
	var nextPrevHTML = "<button id='lANDI508-viewList-button-prev' aria-label='Previous Item in the list' accesskey='"+andiHotkeyList.key_prev.key+"'><img src='"+icons_url+"prev.png' alt='' /></button>"+
		"<button id='lANDI508-viewList-button-next' aria-label='Next Item in the list'  accesskey='"+andiHotkeyList.key_next.key+"'><img src='"+icons_url+"next.png' alt='' /></button>"+
		"</div>"+
		"<div class='ANDI508-list-scrollable'><table id='ANDI508-viewList-table' aria-label='"+mode+" List' tabindex='-1'><thead><tr>";
	
	if(mode === "links"){
		//BUILD LINKS LIST TABLE
		var displayHref, targetText;
		for(var x=0; x<lANDI.links.list.length; x++){
			//get target text if internal link
			targetText = "";
			if(!lANDI.links.list[x].href.toLowerCase().includes("javascript:")){
				if(lANDI.links.list[x].href.charAt(0)!="#") //href doesn't start with # (points externally)
					targetText = "target='_landi'";
				displayHref = "<a href='"+lANDI.links.list[x].href+"' "+targetText+">"+lANDI.links.list[x].href+"</a>";
			}
			else{ //href contains javascript
				displayHref = lANDI.links.list[x].href;
			}

			//determine if there is an alert
			rowClasses = "";
			var nextTabButton = "";
			if(lANDI.links.list[x].alerts.includes("Alert"))
				rowClasses += "ANDI508-table-row-alert ";
			
			if(lANDI.links.list[x].linkPurpose == "i"){
				rowClasses += "lANDI508-listLinks-internal ";
				nextTabButton = " <button class='lANDI508-nextTab' data-ANDI508-relatedId='"+lANDI.links.list[x].href+"' title='focus on the element after id="+lANDI.links.list[x].href+"'>next tab</button>";
			}
			else if(lANDI.links.list[x].linkPurpose == "e")
				rowClasses += "lANDI508-listLinks-external ";
			
			tableHTML += "<tr class='" + $.trim(rowClasses) + "'>"+
				"<th scope='row'>"+lANDI.links.list[x].index+"</th>"+
				"<td class='ANDI508-alert-column'>"+lANDI.links.list[x].alerts+"</td>"+
				"<td><a href='javascript:void(0)' data-ANDI508-relatedIndex='"+lANDI.links.list[x].index+"'>"+lANDI.links.list[x].nameDescription+"</a></td>"+
				"<td class='ANDI508-code'>"+displayHref+nextTabButton+"</td>"+
				"</tr>";
		}

		tabsHTML = "<button id='lANDI508-listLinks-tab-all' aria-label='View All Links' aria-selected='true' class='ANDI508-tab-active' data-lANDI508-relatedClass='ANDI508-element'>all links</button>";
		if(lANDI.links.internalCount > 0)
			tabsHTML += "<button id='lANDI508-listLinks-tab-internal' aria-label='View Skip Links' aria-selected='false' data-lANDI508-relatedClass='lANDI508-internalLink'>skip links ("+lANDI.links.internalCount+")</button>";
		if(lANDI.links.externalCount > 0)
			tabsHTML += "<button id='lANDI508-listLinks-tab-external' aria-label='View External Links' aria-selected='false' data-lANDI508-relatedClass='lANDI508-externalLink'>external links ("+lANDI.links.externalCount+")</button>";
		
		appendHTML += tabsHTML + nextPrevHTML + "<th scope='col' style='width:5%'><a href='javascript:void(0)' aria-label='link number'>#<i aria-hidden='true'></i></a></th>"+
			"<th scope='col' style='width:10%'><a href='javascript:void(0)'>Alerts&nbsp;<i aria-hidden='true'></i></a></th>"+
			"<th scope='col' style='width:40%'><a href='javascript:void(0)'>Accessible&nbsp;Name&nbsp;&amp;&nbsp;Description&nbsp;<i aria-hidden='true'></i></a></th>"+
			"<th scope='col' style='width:45%'><a href='javascript:void(0)'>href <i aria-hidden='true'></i></a></th>";
	}
	else{
		//BUILD BUTTON LIST TABLE
		for(var b=0; b<lANDI.buttons.list.length; b++){
			//determine if there is an alert
			rowClasses = "";
			if(lANDI.buttons.list[b].alerts.includes("Alert"))
				rowClasses += "ANDI508-table-row-alert ";
			
			tableHTML += "<tr class='" + $.trim(rowClasses) + "'>"+
				"<th scope='row'>"+lANDI.buttons.list[b].index+"</th>"+
				"<td class='ANDI508-alert-column'>"+lANDI.buttons.list[b].alerts+"</td>"+
				"<td><a href='javascript:void(0)' data-ANDI508-relatedIndex='"+lANDI.buttons.list[b].index+"'>"+lANDI.buttons.list[b].nameDescription+"</a></td>"+
				"<td>"+lANDI.buttons.list[b].accesskey+"</td>"+
				"</tr>";
		}

		tabsHTML = "<button id='lANDI508-listButtons-tab-all' aria-label='View All Buttons' aria-selected='true' class='ANDI508-tab-active' data-lANDI508-relatedClass='ANDI508-element'>all buttons</button>";
		
		appendHTML += tabsHTML + nextPrevHTML + "<th scope='col' style='width:5%'><a href='javascript:void(0)' aria-label='button number'>#<i aria-hidden='true'></i></a></th>"+
			"<th scope='col' style='width:10%'><a href='javascript:void(0)'>Alerts&nbsp;<i aria-hidden='true'></i></a></th>"+
			"<th scope='col' style='width:75%'><a href='javascript:void(0)'>Accessible&nbsp;Name&nbsp;&amp;&nbsp;Description&nbsp;<i aria-hidden='true'></i></a></th>"+
			"<th scope='col' style='width:10%'><a href='javascript:void(0)'>Accesskey <i aria-hidden='true'></i></a></th>";
	}
	
	$("#ANDI508-additionalPageResults").append(appendHTML+"</tr></thead><tbody>"+tableHTML+"</tbody></table></div></div>");

};

//This function hide/shows the view list
lANDI.viewList_toggle = function(mode, btn){
	if($(btn).attr("aria-expanded") === "false"){
		//show List, hide alert list
		$("#ANDI508-alerts-list").hide();
		andiSettings.minimode(false);
		$(btn)
			.addClass("ANDI508-viewOtherResults-button-expanded")
			.html(listIcon+"hide "+mode+" list")
			.attr("aria-expanded","true")
			.find("img").attr("src",icons_url+"list-on.png");
		$("#lANDI508-viewList").slideDown(AndiSettings.andiAnimationSpeed).focus();
		if(mode === "links")
			AndiModule.activeActionButtons.linksList = true;
		else
			AndiModule.activeActionButtons.buttonsList = true;
	}
	else{
		//hide List, show alert list
		$("#lANDI508-viewList").slideUp(AndiSettings.andiAnimationSpeed);
		//$("#ANDI508-resultsSummary").show();
		if(testPageData.numberOfAccessibilityAlertsFound > 0){
			$("#ANDI508-alerts-list").show();
		}
		$(btn)
			.removeClass("ANDI508-viewOtherResults-button-expanded")
			.html(listIcon+"view "+mode+" list")
			.attr("aria-expanded","false");
		if(mode === "links")
			AndiModule.activeActionButtons.linksList = false;
		else
			AndiModule.activeActionButtons.buttonsList = false;
	}
};

//This function will highlight the text of the row.
lANDI.viewList_rowHighlight = function(index){
	$("#ANDI508-viewList-table tbody tr").each(function(){
		$(this).removeClass("ANDI508-table-row-inspecting");
		if($(this).find("th").first().html() == index){
			$(this).addClass("ANDI508-table-row-inspecting");
		}
	});
};

//This function attaches the click,hover,focus events to the items in the view list
lANDI.viewList_attachEvents = function(){
	//Add focus click to each link (output) in the table
	$("#ANDI508-viewList-table td a[data-ANDI508-relatedIndex]").each(function(){
		andiFocuser.addFocusClick($(this));
		var relatedElement = $("#ANDI508-testPage [data-ANDI508-index=" + $(this).attr("data-ANDI508-relatedIndex") + "]").first();
		andiLaser.createLaserTrigger($(this),$(relatedElement));
		$(this)
		.hover(function(){
			if(!event.shiftKey)
				lANDI.inspect($(relatedElement));
		})
		.focus(function(){
			lANDI.inspect($(relatedElement));
		});
	});
	
	//This will define the click logic for the table sorting.
	//Table sorting does not use aria-sort because .removeAttr("aria-sort") crashes in old IE
	$("#ANDI508-viewList-table th a").click(function(){
		var table = $(this).closest("table");
		$(table).find("th").find("i").html("")
			.end().find("a"); //remove all arrow

		var rows = $(table).find("tr:gt(0)").toArray().sort(sortCompare($(this).parent().index()));
		this.asc = !this.asc;
		if(!this.asc){
			rows = rows.reverse();
			$(this).attr("title","descending")
				.parent().find("i").html("&#9650;"); //up arrow
		}
		else{
			$(this).attr("title","ascending")
				.parent().find("i").html("&#9660;"); //down arrow
		}
		for(var i=0; i<rows.length; i++){
			$(table).append(rows[i]);
		}
		
		//Table Sort Functionality
		function sortCompare(index){
			return function(a, b){
				var valA = getCellValue(a, index);
				var valB = getCellValue(b, index);
				return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.localeCompare(valB);
			};
			function getCellValue(row, index){
				return $(row).children("td,th").eq(index).text();
			}
		}
	});
	
	//Define listLinks next button
	$("#lANDI508-viewList-button-next").click(function(){
		//Get class name based on selected tab
		var selectedTabClass = $("#lANDI508-viewList-tabs button[aria-selected='true']").attr("data-lANDI508-relatedClass");
		var index = parseInt($("#ANDI508-testPage .ANDI508-element-active").attr("data-ANDI508-index"));
		var focusGoesOnThisIndex;

		if(index == testPageData.andiElementIndex || isNaN(index)){
			//No link being inspected yet, get first element according to selected tab
			focusGoesOnThisIndex = $("#ANDI508-testPage ."+selectedTabClass).first().attr("data-ANDI508-index");
			andiFocuser.focusByIndex(focusGoesOnThisIndex); //loop back to first
		}
		else{
			//Find the next element with class from selected tab and data-ANDI508-index
			//This will skip over elements that may have been removed from the DOM
			for(var x=index; x<testPageData.andiElementIndex; x++){
				//Get next element within set of selected tab type
				if($("#ANDI508-testPage ."+selectedTabClass+"[data-ANDI508-index='"+(x + 1)+"']").length){
					focusGoesOnThisIndex = x + 1;
					andiFocuser.focusByIndex(focusGoesOnThisIndex);
					break;
				}
			}
		}
		
		//Highlight the row in the links list that associates with this element
		lANDI.viewList_rowHighlight(focusGoesOnThisIndex);
		$("#ANDI508-viewList-table tbody tr.ANDI508-table-row-inspecting").first().each(function(){
			this.scrollIntoView();
		});
		
		return false;
	});
	
	//Define listLinks prev button
	$("#lANDI508-viewList-button-prev").click(function(){
		//Get class name based on selected tab
		var selectedTabClass = $("#lANDI508-viewList-tabs button[aria-selected='true']").attr("data-lANDI508-relatedClass");
		var index = parseInt($("#ANDI508-testPage .ANDI508-element-active").attr("data-ANDI508-index"));
		var firstElementInListIndex = $("#ANDI508-testPage ."+selectedTabClass).first().attr("data-ANDI508-index");
		var focusGoesOnThisIndex;
		
		if(isNaN(index)){ //no active element yet
			//get first element according to selected tab
			andiFocuser.focusByIndex(firstElementInListIndex); //loop back to first
			focusGoesOnThisIndex = firstElementInListIndex;
		}
		else if(index == firstElementInListIndex){
			//Loop to last element in list
			focusGoesOnThisIndex = $("#ANDI508-testPage ."+selectedTabClass).last().attr("data-ANDI508-index");
			andiFocuser.focusByIndex(focusGoesOnThisIndex); //loop back to last
		}
		else{
			//Find the previous element with class from selected tab and data-ANDI508-index
			//This will skip over elements that may have been removed from the DOM
			for(var x=index; x>0; x--){
				//Get next element within set of selected tab type
				if($("#ANDI508-testPage ."+selectedTabClass+"[data-ANDI508-index='"+(x - 1)+"']").length){
					focusGoesOnThisIndex = x - 1;
					andiFocuser.focusByIndex(focusGoesOnThisIndex);
					break;
				}
			}
		}
		
		//Highlight the row in the links list that associates with this element
		lANDI.viewList_rowHighlight(focusGoesOnThisIndex);
		$("#ANDI508-viewList-table tbody tr.ANDI508-table-row-inspecting").first().each(function(){
			this.scrollIntoView();
		});
		
		return false;
	});
};

//This function attaches click events to the items specific to the Links view list
lANDI.viewList_attachEvents_links = function(){
	$("#lANDI508-listLinks-tab-all").click(function(){
		lANDI.viewList_selectTab(this);
		$("#ANDI508-viewList-table tbody tr").show();
		//Remove All (glowing) Highlights
		$("#ANDI508-testPage").removeClass("lANDI508-highlightInternal lANDI508-highlightExternal lANDI508-highlightAmbiguous");
		//Turn Off Ambiguous Button
		andiOverlay.overlayButton_off("find",$("#ANDI508-highlightAmbiguousLinks-button"));
		andiResetter.resizeHeights();
		return false;
	});
	$("#lANDI508-listLinks-tab-internal").click(function(){
		lANDI.viewList_selectTab(this);
		$("#ANDI508-viewList-table tbody tr").each(function(){
			if($(this).hasClass("lANDI508-listLinks-internal"))
				$(this).show();
			else
				$(this).hide();
		});
		//Add (glowing) Highlight for Internal Links
		$("#ANDI508-testPage").removeClass("lANDI508-highlightExternal lANDI508-highlightAmbiguous").addClass("lANDI508-highlightInternal");
		//Turn Off Ambiguous Button
		andiOverlay.overlayButton_off("find",$("#ANDI508-highlightAmbiguousLinks-button"));
		andiResetter.resizeHeights();
		return false;
	});
	$("#lANDI508-listLinks-tab-external").click(function(){
		lANDI.viewList_selectTab(this);
		$("#ANDI508-viewList-table tbody tr").each(function(){
			if($(this).hasClass("lANDI508-listLinks-external"))
				$(this).show();
			else
				$(this).hide();
		});
		//Add (glowing) Highlight for External Links
		$("#ANDI508-testPage").removeClass("lANDI508-highlightInternal lANDI508-highlightAmbiguous").addClass("lANDI508-highlightExternal");
		//Turn Off Ambiguous Button
		andiOverlay.overlayButton_off("find",$("#ANDI508-highlightAmbiguousLinks-button"));
		andiResetter.resizeHeights();
		return false;
	});
	
	//Define next tab button
	$("#ANDI508-viewList-table button.lANDI508-nextTab").each(function(){
		$(this).click(function(){
			var allElementsInTestPage = $("#ANDI508-testPage *");
			//TODO: make it work for <a name=>
			var anchorTargetElement = $($(this).attr("data-ANDI508-relatedId"));
			var anchorTargetElementIndex = parseInt($(allElementsInTestPage).index($(anchorTargetElement)), 10);
			for(var x=anchorTargetElementIndex; x<allElementsInTestPage.length; x++){
				if($(allElementsInTestPage).eq(x).is(":tabbable")){
					$(allElementsInTestPage).eq(x).focus();
					break;
				}
			}
		});
	});
};

//This function attaches click events to the items specific to the Buttons view list
lANDI.viewList_attachEvents_buttons = function(){
	$("#lANDI508-listButtons-tab-all").click(function(){
		lANDI.viewList_selectTab(this);
		$("#ANDI508-viewList-table tbody tr").show();
		//Remove All (glowing) Highlights
		$("#ANDI508-testPage").removeClass("lANDI508-highlightAmbiguous");
		//Turn Off Ambiguous Button
		andiOverlay.overlayButton_off("find",$("#ANDI508-highlightNonUniqueButtons-button"));
		andiResetter.resizeHeights();
		return false;
	});
};

//This function handles the selection of a tab.
lANDI.viewList_selectTab = function(tab){
	$("#lANDI508-viewList-tabs button").removeClass().attr("aria-selected","false");
	$(tab).addClass("ANDI508-tab-active").attr("aria-selected","true");
};

lANDI.analyze();
lANDI.results();

}//end init

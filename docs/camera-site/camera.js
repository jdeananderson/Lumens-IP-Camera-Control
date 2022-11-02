var origCameraSettings = {}, cameraSettings = {}, updateCameraSettings = {};
var cameraUserSettings;
var cameraAuthority;
var cameraIsAdmin = true;
var gcameraPowermode = 0;/* power button : Status/Color  [0: Off/Orange ; 1: On/Green] */
var tabID;

/*

Mode : Iris Pri		: irispriidx / irispriname                            15
	   Manual		: irismanualidx / irismanualname                      15
	   Others		: Disable (irislimitidx / irislimitname)               8

Mode : Shutter Pri	: shutterpriidx / shutterpriname                      22
	   Manual		: shuttermanualidx / shuttermanualname                22
	   Others		: Disable (X) shuttermanualidx / shuttermanualname    22

Mode : Manual		: gainmanualidx / gainmanualname                      16
	   Others		: Disable (gainlimitidx / gainlimitname)              12

*/
function saveCameraSettings(afterSave) {
    if(cameraIsAdmin){
        var optionSet = [ "exposuremodeindex", "wdridx", "wbmodeidx", "focusautoidx", "mirrornameidx" ];
    }else{
        var optionSet = [ "exposuremodeindex", "wdridx", "focusautoidx", "mirrornameidx" ];
    }

    switch($('#epModeId option:selected').val()){
        case "Manual":
            optionSet = optionSet.concat([ "gainmanualidx", "shuttermanualidx", "irismanualidx" ]);
            break;
        case "Shutter Pri":
            //optionSet = optionSet.concat([ "shutterpriidx", "exposurelevelname" ]);
            optionSet = optionSet.concat([ "shutterpriidx" ]);
            break;
        case "Iris Pri":
            //optionSet = optionSet.concat([ "irispriidx", "exposurelevelname" ]);
            optionSet = optionSet.concat([ "irispriidx" ]);
            break;
        default:
            //optionSet = optionSet.concat([ "exposurelevelname" ]);
            break;
    }
    switch($('#focusAutoId option:selected').val()){
        case "Manual":
            //optionSet = optionSet.concat([ "focuspositon" ]);
            if ( cameraSettings.softwareversion.search("VCT") == -1) {
                optionSet = optionSet.concat([ "afzoomtrackingidx" ]);
            }else{//---VC-A20P
                ;
            }
            break;
        case "Auto":
            optionSet = optionSet.concat([ "afsensitivityidx", "afspeednameidx", "afframenameidx" ]);
            break;
        default:
            break;
    }

    /* @Lawliet */
    sendSettings(cameraSettings, optionSet, function() {
        checkReload(function(reloadRequired) {
            if (reloadRequired) {
                videoManager.stopAndHide();
                $("#updateModal").modal({backdrop:'static', keyboard:false});
                new modalProgress(parseDecimal(cameraSettings.reloadtime), function() {
                    $("#updateModal").modal('hide');
                    delayedExec(afterSave);
                });
            } else {
                delayedExec(afterSave);
            }
        });
    });
}

function onePushTriggerAction() {

    restartTimerManager(refreshCameraPage);

    $.ajax({
        url:IPNC.serverURL + 'vb.htm',
        data:"wbonepushtrigger=1",
        success: function(data) {
            logDebug("power mode success");
        }
    });
}

function updateDisableAttr(id, disable) {
    if((disable != false) && (disable != true)) return;

    document.getElementById(id).disabled = disable;
}

function updateCameraComboValue(nowSettings, option, optionId) {
    updateFromCombo(nowSettings, option, optionId);
}

/* Special Case : Because We use n * change:curry(updateCameraIrisComboValue, xx, xx, xx) and different parameter */
function updateCameraIrisComboValue(nowSettings, option, optionId) {

    restartTimerManager(refreshCameraPage);

    /* We must re-check : function parameter - option */
    switch(nowSettings.exposuremodeindex){
        case 2:
            /* Iris Pri */
            updateFromCombo(nowSettings, "irispriidx", optionId);
            break;
        case 3:
            /* Manual */
            updateFromCombo(nowSettings, "irismanualidx", optionId);
            break;
        default:
            /*
                0 : Full Auto
                1 : Shutter Pri
                4 : White Board
                5 : Smooth Auto
            */
            updateFromCombo(nowSettings, "irislimitidx", optionId);
            break;
    }
}

/* Special Case : Because We use n * change:curry(updateCameraShutterComboValue, xx, xx, xx) and different parameter */
function updateCameraShutterComboValue(nowSettings, option, optionId) {

    restartTimerManager(refreshCameraPage);

    /* We must re-check : function parameter - option */
    switch(nowSettings.exposuremodeindex){
        case 1:
            /* Shutter Pri */
            updateFromCombo(nowSettings, "shutterpriidx", optionId);
            break;
        default:
            /*
                0 : Full Auto
                2 : Iris Pri
                3 : Manual
                4 : White Board
                5 : Smooth Auto
            */
            updateFromCombo(nowSettings, "shuttermanualidx", optionId);
            break;
    }
}

/* Special Case : Because We use n * change:curry(updateCameraGainComboValue, xx, xx, xx) and different parameter */
function updateCameraGainComboValue(nowSettings, option, optionId) {

    restartTimerManager(refreshCameraPage);

    /* We must re-check : function parameter - option */
    switch(nowSettings.exposuremodeindex){
        case 3:
            /* Manual */
            updateFromCombo(nowSettings, "gainmanualidx", optionId);
            break;
        default:
            /*
                0 : Full Auto
                 1 : Shutter Pri
                2 : Iris Pri
                4 : White Board
                5 : Smooth Auto
            */
            updateFromCombo(nowSettings, "gainlimitidx", optionId);
            break;
    }
}

/* update all options of the Combobox @Lawliet */
function updateCameraComboOptions(nowSettings, option, comboOptions, optionId) {
    /* clean all options of the Combobox  */
    document.getElementById(optionId).options.length = 0;

    /* add  new options of the Combobox  */
    $.each(nowSettings[comboOptions], function(i, m) {
        document.getElementById(optionId).options[i] = new Option(m, "");
    });

    /* restore new selectedIndex */
    document.getElementById(optionId).selectedIndex = nowSettings[option];
}

function updateExposureMode(nowSettings ,option, optionId) {
    updateCameraComboValue(nowSettings ,option, optionId);

    switch($('#epModeId option:selected').val()){
        case "Manual":
            updateDisableAttr("gainId"             , false);
            updateDisableAttr("shutterSpeedId"     , false);
            updateDisableAttr("irisesId"           , false);
            updateDisableAttr("epCompLvlId"        , true);
            updateDisableAttr("epCompLvlMinusId"   , true);
            updateDisableAttr("epCompLvlPlusId"    , true);

            updateCameraComboOptions(nowSettings, "irismanualidx"   , "irismanuals"   , "irisesId");
            updateCameraComboOptions(nowSettings, "shuttermanualidx", "shuttermanuals", "shutterSpeedId");
            updateCameraComboOptions(nowSettings, "gainmanualidx"   , "gainmanuals"   , "gainId");
            break;
        case "Shutter Pri":
            updateDisableAttr("gainId"             , true);
            updateDisableAttr("shutterSpeedId"     , false);
            updateDisableAttr("irisesId"           , true);
            updateDisableAttr("epCompLvlId"        , false);
            updateDisableAttr("epCompLvlMinusId"   , false);
            updateDisableAttr("epCompLvlPlusId"    , false);

            updateCameraComboOptions(nowSettings, "irislimitidx" , "irislimits" , "irisesId");
            updateCameraComboOptions(nowSettings, "shutterpriidx", "shutterpris", "shutterSpeedId");
            updateCameraComboOptions(nowSettings, "gainlimitidx" , "gainlimits" , "gainId");
            break;
        case "Iris Pri":
            updateDisableAttr("gainId"             , true);
            updateDisableAttr("shutterSpeedId"     , true);
            updateDisableAttr("irisesId"           , false);
            updateDisableAttr("epCompLvlId"        , false);
            updateDisableAttr("epCompLvlMinusId"   , false);
            updateDisableAttr("epCompLvlPlusId"    , false);

            updateCameraComboOptions(nowSettings, "irispriidx"      , "irispris"      , "irisesId");
            updateCameraComboOptions(nowSettings, "shuttermanualidx", "shuttermanuals", "shutterSpeedId");
            updateCameraComboOptions(nowSettings, "gainlimitidx"    , "gainlimits"    , "gainId");
            break;
        //case "Full Auto":
        //case "White Board":
        //case "Smooth Auto":
        default:
            updateDisableAttr("gainId"             , true);
            updateDisableAttr("shutterSpeedId"     , true);
            updateDisableAttr("irisesId"           , true);
            updateDisableAttr("epCompLvlId"        , false);
            updateDisableAttr("epCompLvlMinusId"   , false);
            updateDisableAttr("epCompLvlPlusId"    , false);

            updateCameraComboOptions(nowSettings, "irislimitidx"    , "irislimits"    , "irisesId");
            updateCameraComboOptions(nowSettings, "shuttermanualidx", "shuttermanuals", "shutterSpeedId");
            updateCameraComboOptions(nowSettings, "gainlimitidx"    , "gainlimits"    , "gainId");
            break;
    }
}

function updateWhiteBalanceMode(nowSettings ,option, optionId) {
    updateCameraComboValue(nowSettings ,option, optionId);

    switch($('#wbModeId option:selected').val()){
        case "One Push WB":
            updateDisableAttr("manualRedId"      , true);
            updateDisableAttr("manualRedMinusId" , true);
            updateDisableAttr("manualRedPlusId"  , true);
            updateDisableAttr("manualBlueId"     , true);
            updateDisableAttr("manualBlueMinusId", true);
            updateDisableAttr("manualBluePlusId" , true);
            updateDisableAttr("pushButtonId"     , false);
            break;
        case "Manual":
            updateDisableAttr("manualRedId"      , false);
            updateDisableAttr("manualRedMinusId" , false);
            updateDisableAttr("manualRedPlusId"  , false);
            updateDisableAttr("manualBlueId"     , false);
            updateDisableAttr("manualBlueMinusId", false);
            updateDisableAttr("manualBluePlusId" , false);
            updateDisableAttr("pushButtonId"     , true);
            break;
        default:
            updateDisableAttr("manualRedId"      , true);
            updateDisableAttr("manualRedMinusId" , true);
            updateDisableAttr("manualRedPlusId"  , true);
            updateDisableAttr("manualBlueId"     , true);
            updateDisableAttr("manualBlueMinusId", true);
            updateDisableAttr("manualBluePlusId" , true);
            updateDisableAttr("pushButtonId"     , true);
            break;
    }
}

function updateFocusAuto(nowSettings ,option, optionId) {
    updateCameraComboValue(nowSettings ,option, optionId);

    switch($('#focusAutoId option:selected').val()){
        case "Manual":
            updateDisableAttr("manualFocusRangeId"     , false);
            updateDisableAttr("manualFocusRangeMinusId", false);
            updateDisableAttr("manualFocusRangePlusId" , false);
            updateDisableAttr("afSensitivitiesId"      , true);
            updateDisableAttr("afSpeedsId"             , true);
            updateDisableAttr("afFramesId"             , true);
            if ( cameraSettings.softwareversion.search("VCT") == -1) {
                updateDisableAttr("afZoomTrackingId"       , false);
            }else{//---VC-A20P
                ;
            }

            break;
        case "Auto":
            updateDisableAttr("manualFocusRangeId"     , true);
            updateDisableAttr("manualFocusRangeMinusId", true);
            updateDisableAttr("manualFocusRangePlusId" , true);
            updateDisableAttr("afSensitivitiesId"      , false);
            updateDisableAttr("afSpeedsId"             , false);
            updateDisableAttr("afFramesId"             , false);
            if ( cameraSettings.softwareversion.search("VCT") == -1) {
                updateDisableAttr("afZoomTrackingId"       , true);
            }else{//---VC-A20P
                ;
            }
            break;
        default:
            break;
    }
}

function epTabContent() {
    var pathname_string = location.pathname.split("/");
    var region;
    for (i = 0; i < pathname_string.length; i++) {
        if ( pathname_string[i].length == 2 )
            region = pathname_string[i];
    }

    if(isIE(7)){
        /* IE7 */
        if(cameraSettings.exposuremodeindex == 1){
            /* Shutter Pri */
            return mkElemClass("div", "form-horizontal", [

                makeInlineSelectionInput(mode, "epModeId", cameraSettings.exposuremodes, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.exposuremodeindex,
                    change:curry(updateExposureMode, cameraSettings, "exposuremodeindex", "epModeId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative1":"lumenswb2-ie7-tw-tab-relative1"),

                makeInlineSelectionInput(iris, "irisesId", cameraSettings.irislimits, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.irislimitidx,
                    change:curry(updateCameraIrisComboValue, cameraSettings, "irislimitidx", "irisesId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative2":"lumenswb2-ie7-tw-tab-relative2"),mkBreak(),mkBreak(),

                buttonInlineControls(expCompLevel, "epCompLvlMinusId", "epCompLvlPlusId", "epCompLvlId"),

                makeInlineSelectionInput(wdr, "wdrsId", cameraSettings.wdrs, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.wdridx,
                    change:curry(updateCameraComboValue, cameraSettings, "wdridx", "wdrsId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative3":"lumenswb2-tw-tab-relative6"),mkBreak(),mkBreak(),

                makeInlineSelectionInput(gain, "gainId", cameraSettings.gainlimits, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.gainlimitidx,
                    change:curry(updateCameraGainComboValue, cameraSettings, "gainlimitidx", "gainId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative4":"lumenswb2-ie7-tw-tab-relative4"),

                makeInlineSelectionInput(shutterSpeed, "shutterSpeedId", cameraSettings.shutterpris, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.shutterpriidx,
                    change:curry(updateCameraShutterComboValue, cameraSettings, "shutterpriidx", "shutterSpeedId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative5":"lumenswb2-ie7-tw-tab-relative5")
            ]);
        }else if(cameraSettings.exposuremodeindex == 2){
            /* Iris Pri */
            return mkElemClass("div", "form-horizontal", [

                makeInlineSelectionInput(mode, "epModeId", cameraSettings.exposuremodes, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.exposuremodeindex,
                    change:curry(updateExposureMode, cameraSettings, "exposuremodeindex", "epModeId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative1":"lumenswb2-ie7-tw-tab-relative1"),

                makeInlineSelectionInput(iris, "irisesId", cameraSettings.irispris, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.irispriidx,
                    change:curry(updateCameraIrisComboValue, cameraSettings, "irispriidx", "irisesId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative2":"lumenswb2-ie7-tw-tab-relative2"),mkBreak(),mkBreak(),

                buttonInlineControls(expCompLevel, "epCompLvlMinusId", "epCompLvlPlusId", "epCompLvlId"),

                makeInlineSelectionInput(wdr, "wdrsId", cameraSettings.wdrs, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.wdridx,
                    change:curry(updateCameraComboValue, cameraSettings, "wdridx", "wdrsId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative3":"lumenswb2-tw-tab-relative6"),mkBreak(),mkBreak(),

                makeInlineSelectionInput(gain, "gainId", cameraSettings.gainlimits, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.gainlimitidx,
                    change:curry(updateCameraGainComboValue, cameraSettings, "gainlimitidx", "gainId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative4":"lumenswb2-ie7-tw-tab-relative4"),

                makeInlineSelectionInput(shutterSpeed, "shutterSpeedId", cameraSettings.shuttermanuals, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.shuttermanualidx,
                    change:curry(updateCameraShutterComboValue, cameraSettings, "shuttermanualidx", "shutterSpeedId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative5":"lumenswb2-ie7-tw-tab-relative5")
            ]);
        }else if(cameraSettings.exposuremodeindex == 3){
            /* Manual */
            return mkElemClass("div", "form-horizontal", [

                makeInlineSelectionInput(mode, "epModeId", cameraSettings.exposuremodes, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.exposuremodeindex,
                    change:curry(updateExposureMode, cameraSettings, "exposuremodeindex", "epModeId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative1":"lumenswb2-ie7-tw-tab-relative1"),

                makeInlineSelectionInput(iris, "irisesId", cameraSettings.irismanuals, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.irismanualidx,
                    change:curry(updateCameraIrisComboValue, cameraSettings, "irismanualidx", "irisesId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative2":"lumenswb2-ie7-tw-tab-relative2"),mkBreak(),mkBreak(),

                buttonInlineControls(expCompLevel, "epCompLvlMinusId", "epCompLvlPlusId", "epCompLvlId"),

                makeInlineSelectionInput(wdr, "wdrsId", cameraSettings.wdrs, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.wdridx,
                    change:curry(updateCameraComboValue, cameraSettings, "wdridx", "wdrsId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative3":"lumenswb2-tw-tab-relative6"),mkBreak(),mkBreak(),

                makeInlineSelectionInput(gain, "gainId", cameraSettings.gainmanuals, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.gainmanualidx,
                    change:curry(updateCameraGainComboValue, cameraSettings, "gainmanualidx", "gainId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative4":"lumenswb2-ie7-tw-tab-relative4"),

                makeInlineSelectionInput(shutterSpeed, "shutterSpeedId", cameraSettings.shuttermanuals, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.shuttermanualidx,
                    change:curry(updateCameraShutterComboValue, cameraSettings, "shuttermanualidx", "shutterSpeedId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative5":"lumenswb2-ie7-tw-tab-relative5")
            ]);
        }else{
            /*
                cameraSettings.exposuremodeindex
                                                    0 : Full Auto
                                                    4 : White Board
                                                    5 : Smooth Auto
            */
            return mkElemClass("div", "form-horizontal", [

                makeInlineSelectionInput(mode, "epModeId", cameraSettings.exposuremodes, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.exposuremodeindex,
                    change:curry(updateExposureMode, cameraSettings, "exposuremodeindex", "epModeId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative1":"lumenswb2-ie7-tw-tab-relative1"),

                makeInlineSelectionInput(iris, "irisesId", cameraSettings.irislimits, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.irislimitidx,
                    change:curry(updateCameraIrisComboValue, cameraSettings, "irislimitidx", "irisesId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative2":"lumenswb2-ie7-tw-tab-relative2"),mkBreak(),mkBreak(),

                buttonInlineControls(expCompLevel, "epCompLvlMinusId", "epCompLvlPlusId", "epCompLvlId"),

                makeInlineSelectionInput(wdr, "wdrsId", cameraSettings.wdrs, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.wdridx,
                    change:curry(updateCameraComboValue, cameraSettings, "wdridx", "wdrsId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative3":"lumenswb2-tw-tab-relative6"),mkBreak(),mkBreak(),

                makeInlineSelectionInput(gain, "gainId", cameraSettings.gainlimits, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.gainlimitidx,
                    change:curry(updateCameraGainComboValue, cameraSettings, "gainlimitidx", "gainId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative4":"lumenswb2-ie7-tw-tab-relative4"),

                makeInlineSelectionInput(shutterSpeed, "shutterSpeedId", cameraSettings.shuttermanuals, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.shuttermanualidx,
                    change:curry(updateCameraShutterComboValue, cameraSettings, "shuttermanualidx", "shutterSpeedId")
                }, (region=="en")?"lumenswb2-ie7-tab-relative5":"lumenswb2-ie7-tw-tab-relative5")
            ]);
        }
    }else{
        /* not IE7 */
        if(cameraSettings.exposuremodeindex == 1){
            /* Shutter Pri */
            return mkElemClass("div", "form-horizontal", [

                makeInlineSelectionInput(mode, "epModeId", cameraSettings.exposuremodes, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.exposuremodeindex,
                    change:curry(updateExposureMode, cameraSettings, "exposuremodeindex", "epModeId")
                }, (region=="en")?"lumenswb2-tab-relative1":"lumenswb2-ie7-tw-tab-relative1" ),

                makeInlineSelectionInput(iris, "irisesId", cameraSettings.irislimits, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.irislimitidx,
                    change:curry(updateCameraIrisComboValue, cameraSettings, "irislimitidx", "irisesId")
                }, (region=="en")?"lumenswb2-tab-relative2":"lumenswb2-ie7-tw-tab-relative2"),mkBreak(),mkBreak(),

                buttonInlineControls(expCompLevel, "epCompLvlMinusId", "epCompLvlPlusId", "epCompLvlId"),

                makeInlineSelectionInput(wdr, "wdrsId", cameraSettings.wdrs, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.wdridx,
                    change:curry(updateCameraComboValue, cameraSettings, "wdridx", "wdrsId")
                }, (region=="en")?"lumenswb2-tab-relative3":"lumenswb2-tw-tab-relative6"),mkBreak(),mkBreak(),

                makeInlineSelectionInput(gain, "gainId", cameraSettings.gainlimits, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.gainlimitidx,
                    change:curry(updateCameraGainComboValue, cameraSettings, "gainlimitidx", "gainId")
                }, (region=="en")?"lumenswb2-tab-relative4":"lumenswb2-ie7-tw-tab-relative4"),

                makeInlineSelectionInput(shutterSpeed, "shutterSpeedId", cameraSettings.shutterpris, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.shutterpriidx,
                    change:curry(updateCameraShutterComboValue, cameraSettings, "shutterpriidx", "shutterSpeedId")
                }, (region=="en")?"lumenswb2-tab-relative5":"lumenswb2-ie7-tw-tab-relative5")
            ]);
        }else if(cameraSettings.exposuremodeindex == 2){
            /* Iris Pri */
            return mkElemClass("div", "form-horizontal", [

                makeInlineSelectionInput(mode, "epModeId", cameraSettings.exposuremodes, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.exposuremodeindex,
                    change:curry(updateExposureMode, cameraSettings, "exposuremodeindex", "epModeId")
                }, (region=="en")?"lumenswb2-tab-relative1":"lumenswb2-ie7-tw-tab-relative1"),

                makeInlineSelectionInput(iris, "irisesId", cameraSettings.irispris, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.irispriidx,
                    change:curry(updateCameraIrisComboValue, cameraSettings, "irispriidx", "irisesId")
                }, (region=="en")?"lumenswb2-tab-relative2":"lumenswb2-ie7-tw-tab-relative2"),mkBreak(),mkBreak(),

                buttonInlineControls(expCompLevel, "epCompLvlMinusId", "epCompLvlPlusId", "epCompLvlId"),

                makeInlineSelectionInput(wdr, "wdrsId", cameraSettings.wdrs, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.wdridx,
                    change:curry(updateCameraComboValue, cameraSettings, "wdridx", "wdrsId")
                }, (region=="en")?"lumenswb2-tab-relative3":"lumenswb2-tw-tab-relative6"),mkBreak(),mkBreak(),

                makeInlineSelectionInput(gain, "gainId", cameraSettings.gainlimits, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.gainlimitidx,
                    change:curry(updateCameraGainComboValue, cameraSettings, "gainlimitidx", "gainId")
                }, (region=="en")?"lumenswb2-tab-relative4":"lumenswb2-ie7-tw-tab-relative4"),

                makeInlineSelectionInput(shutterSpeed, "shutterSpeedId", cameraSettings.shuttermanuals, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.shuttermanualidx,
                    change:curry(updateCameraShutterComboValue, cameraSettings, "shuttermanualidx", "shutterSpeedId")
                }, (region=="en")?"lumenswb2-tab-relative5":"lumenswb2-ie7-tw-tab-relative5")
            ]);
        }else if(cameraSettings.exposuremodeindex == 3){
            /* Manual */
            return mkElemClass("div", "form-horizontal", [

                makeInlineSelectionInput(mode, "epModeId", cameraSettings.exposuremodes, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.exposuremodeindex,
                    change:curry(updateExposureMode, cameraSettings, "exposuremodeindex", "epModeId")
                }, (region=="en")?"lumenswb2-tab-relative1":"lumenswb2-ie7-tw-tab-relative1"),

                makeInlineSelectionInput(iris, "irisesId", cameraSettings.irismanuals, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.irismanualidx,
                    change:curry(updateCameraIrisComboValue, cameraSettings, "irismanualidx", "irisesId")
                }, (region=="en")?"lumenswb2-tab-relative2":"lumenswb2-ie7-tw-tab-relative2"),mkBreak(),mkBreak(),

                buttonInlineControls(expCompLevel, "epCompLvlMinusId", "epCompLvlPlusId", "epCompLvlId"),

                makeInlineSelectionInput(wdr, "wdrsId", cameraSettings.wdrs, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.wdridx,
                    change:curry(updateCameraComboValue, cameraSettings, "wdridx", "wdrsId")
                }, (region=="en")?"lumenswb2-tab-relative3":"lumenswb2-tw-tab-relative6"),mkBreak(),mkBreak(),

                makeInlineSelectionInput(gain, "gainId", cameraSettings.gainmanuals, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.gainmanualidx,
                    change:curry(updateCameraGainComboValue, cameraSettings, "gainmanualidx", "gainId")
                }, (region=="en")?"lumenswb2-tab-relative4":"lumenswb2-ie7-tw-tab-relative4"),

                makeInlineSelectionInput(shutterSpeed, "shutterSpeedId", cameraSettings.shuttermanuals, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.shuttermanualidx,
                    change:curry(updateCameraShutterComboValue, cameraSettings, "shuttermanualidx", "shutterSpeedId")
                }, (region=="en")?"lumenswb2-tab-relative5":"lumenswb2-ie7-tw-tab-relative5")
            ]);
        }else{
            /*
                cameraSettings.exposuremodeindex
                                                    0 : Full Auto
                                                    4 : White Board
                                                    5 : Smooth Auto
            */
            return mkElemClass("div", "form-horizontal", [

                makeInlineSelectionInput(mode, "epModeId", cameraSettings.exposuremodes, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.exposuremodeindex,
                    change:curry(updateExposureMode, cameraSettings, "exposuremodeindex", "epModeId")
                }, (region=="en")?"lumenswb2-tab-relative1":"lumenswb2-ie7-tw-tab-relative1"),

                makeInlineSelectionInput(iris, "irisesId", cameraSettings.irislimits, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.irislimitidx,
                    change:curry(updateCameraIrisComboValue, cameraSettings, "irislimitidx", "irisesId")
                }, (region=="en")?"lumenswb2-tab-relative2":"lumenswb2-ie7-tw-tab-relative2"),mkBreak(),mkBreak(),

                buttonInlineControls(expCompLevel, "epCompLvlMinusId", "epCompLvlPlusId", "epCompLvlId"),

                makeInlineSelectionInput(wdr, "wdrsId", cameraSettings.wdrs, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.wdridx,
                    change:curry(updateCameraComboValue, cameraSettings, "wdridx", "wdrsId")
                }, (region=="en")?"lumenswb2-tab-relative3":"lumenswb2-tw-tab-relative6"),mkBreak(),mkBreak(),

                makeInlineSelectionInput(gain, "gainId", cameraSettings.gainlimits, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.gainlimitidx,
                    change:curry(updateCameraGainComboValue, cameraSettings, "gainlimitidx", "gainId")
                }, (region=="en")?"lumenswb2-tab-relative4":"lumenswb2-ie7-tw-tab-relative4"),

                makeInlineSelectionInput(shutterSpeed, "shutterSpeedId", cameraSettings.shuttermanuals, {
                    selectClass:"input-medium",
                    selectedIndex:cameraSettings.shuttermanualidx,
                    change:curry(updateCameraShutterComboValue, cameraSettings, "shuttermanualidx", "shutterSpeedId")
                }, (region=="en")?"lumenswb2-tab-relative5":"lumenswb2-ie7-tw-tab-relative5")
            ]);
        }
    }
}

// for translation
var string = location.pathname.split("/");
var region, pan, tilt, clean, save, load, ok, cancel, exposure, whiteBalance, focus, mirror, mode, iris, expCompLevel, wdr, gain, shutterSpeed, onePush, manualRed, manualBlue, focusRange;
for (i = 0; i < string.length; i++) {
    if ( string[i].length == 2 )
        region = string[i];
}

if ( region == "tw" ) {
    pan = "水平";
    tilt = "傾斜";
    clean = "清除";
    save = "儲存";
    load = "載入";
    ok = "確定";
    cancel = "取消";
    exposure = "曝光";
    whiteBalance = "白平衡";
    focus = "對焦";
    mirror = "鏡像";
    mode = "模式";
    iris = "光圈";
    expCompLevel = "曝光補償等級";
    wdr = "寬動態";
    gain = "增益";
    shutterSpeed = "快門變焦";
    onePush = "單次觸發";
    manualRed = "色溫調整 紅色";
    manualBlue = "色溫調整 藍色";
    focusRange = "對焦範圍";
} else if ( region == "zh" ) {
    pan = "摇移";
    tilt = "俯仰";
    clean = "清除";
    save = "储存";
    load = "载入";
    ok = "确定";
    cancel = "取消";
    exposure = "曝光";
    whiteBalance = "白平衡";
    focus = "对焦";
    mirror = "镜像";
    mode = "模式";
    iris = "光圈";
    expCompLevel = "曝光补偿等级";
    wdr = "宽动态";
    gain = "增益";
    shutterSpeed = "快门变焦";
    onePush = "单次触发";
    manualRed = "色温调整 红色";
    manualBlue = "色温调整 蓝色";
    focusRange = "对焦范围";
} else {
    pan = "Pan";
    tilt = "Tilt";
    clean = "Clean";
    save = "Save";
    load = "Load";
    ok = "OK";
    cancel = "Cancel";
    exposure = "Exposure";
    whiteBalance = "White Balance";
    focus = "Focus";
    mirror = "Mirror";
    mode = "Mode";
    iris = "Iris";
    expCompLevel = "Exposure Comp. Level ";
    wdr = "WDR";
    gain = "Gain";
    shutterSpeed = "Shutter Speed";
    onePush = "One Push Trigger";
    manualRed = "Manual Red ";
    manualBlue = "Manual Blue ";
    focusRange = "Focus Range";
}

function wbTabContent() {
    return mkElemClass("div", "form-horizontal", [
        /*				mkSelectionInput("Mode", "wbModeId", cameraSettings.wbmodes, {
                              selectClass:"input-medium",
                            selectedIndex:cameraSettings.wbmodeidx,
                            change:curry(updateWhiteBalanceMode, cameraSettings, "wbmodeidx", "wbModeId")
                            //change:updateWhiteBalanceMode
                          }),
        */
        updSelectionInput2("wbModeId", cameraSettings.wbmodes, {
            selectedIndex:cameraSettings.wbmodeidx,
            change:curry(updateWhiteBalanceMode, cameraSettings, "wbmodeidx", "wbModeId")
        }),

        mkIdButton(onePush, "pushButtonId", onePushTriggerAction, "lumenswb2-btn-relative-left btn-normal"),mkBreak(),mkBreak(),

        buttonControls(manualRed, "manualRedMinusId", "manualRedPlusId", "manualRedId"),

        buttonControls(manualBlue, "manualBlueMinusId", "manualBluePlusId", "manualBlueId")
    ]);
}

function fcTabContent() {

    if ( cameraSettings.softwareversion.search("VCT") == -1) {
        return mkElemClass("div", "form-horizontal", [

            /*				mkSelectionInput("Mode", "focusAutoId", cameraSettings.focusautos, {
                                  selectClass:"input-medium",
                                selectedIndex:cameraSettings.focusautoidx,
                                change:curry(updateFocusAuto, cameraSettings, "focusautoidx", "focusAutoId")
                                //change:updateFocusAuto
                              }), */

            updSelectionInput2("focusAutoId", cameraSettings.focusautos, {
                selectedIndex:cameraSettings.focusautoidx,
                change:curry(updateFocusAuto, cameraSettings, "focusautoidx", "focusAutoId")
                //change:updateFocusAuto
            }),

            buttonControls(focusRange, "manualFocusRangeMinusId", "manualFocusRangePlusId", "manualFocusRangeId"),

            /*				mkSelectionInput("AF Sensitivity", "afSensitivitiesId", cameraSettings.afsensitivities, {
                                  selectClass:"input-medium",
                                selectedIndex:cameraSettings.afsensitivityidx,
                                change:curry(updateCameraComboValue, cameraSettings, "afsensitivityidx", "afSensitivitiesId")
                              }), */

            updSelectionInput2("afSensitivitiesId", cameraSettings.afsensitivities, {
                selectedIndex:cameraSettings.afsensitivityidx,
                change:curry(updateCameraComboValue, cameraSettings, "afsensitivityidx", "afSensitivitiesId")
            }),

            /*				mkSelectionInput("AF Speed", "afSpeedsId", cameraSettings.afspeeds, {
                                  selectClass:"input-medium",
                                selectedIndex:cameraSettings.afspeednameidx,
                                change:curry(updateCameraComboValue, cameraSettings, "afspeednameidx", "afSpeedsId")
                              }), */

            updSelectionInput2("afSpeedsId", cameraSettings.afspeeds, {
                selectedIndex:cameraSettings.afspeednameidx,
                change:curry(updateCameraComboValue, cameraSettings, "afspeednameidx", "afSpeedsId")
            }),

            /*				mkSelectionInput("AF Frame", "afFramesId", cameraSettings.afframes, {
                                  selectClass:"input-medium",
                                selectedIndex:cameraSettings.afframenameidx,
                                change:curry(updateCameraComboValue, cameraSettings, "afframenameidx", "afFramesId")
                              }) */
            updSelectionInput2("afFramesId", cameraSettings.afframes, {
                selectedIndex:cameraSettings.afframenameidx,
                change:curry(updateCameraComboValue, cameraSettings, "afframenameidx", "afFramesId")
            }),

            updSelectionInput2("afZoomTrackingId", cameraSettings.afzoomtracking, {
                selectedIndex:cameraSettings.afzoomtrackingidx,
                change:curry(updateCameraComboValue, cameraSettings, "afzoomtrackingidx", "afZoomTrackingId")
            })
        ]);
    }else{//---VC-A20P
        return mkElemClass("div", "form-horizontal", [

            /*				mkSelectionInput("Mode", "focusAutoId", cameraSettings.focusautos, {
                                  selectClass:"input-medium",
                                selectedIndex:cameraSettings.focusautoidx,
                                change:curry(updateFocusAuto, cameraSettings, "focusautoidx", "focusAutoId")
                                //change:updateFocusAuto
                              }), */

            updSelectionInput2("focusAutoId", cameraSettings.focusautos, {
                selectedIndex:cameraSettings.focusautoidx,
                change:curry(updateFocusAuto, cameraSettings, "focusautoidx", "focusAutoId")
                //change:updateFocusAuto
            }),

            buttonControls(focusRange, "manualFocusRangeMinusId", "manualFocusRangePlusId", "manualFocusRangeId"),

            /*				mkSelectionInput("AF Sensitivity", "afSensitivitiesId", cameraSettings.afsensitivities, {
                                  selectClass:"input-medium",
                                selectedIndex:cameraSettings.afsensitivityidx,
                                change:curry(updateCameraComboValue, cameraSettings, "afsensitivityidx", "afSensitivitiesId")
                              }), */

            updSelectionInput2("afSensitivitiesId", cameraSettings.afsensitivities, {
                selectedIndex:cameraSettings.afsensitivityidx,
                change:curry(updateCameraComboValue, cameraSettings, "afsensitivityidx", "afSensitivitiesId")
            }),

            /*				mkSelectionInput("AF Speed", "afSpeedsId", cameraSettings.afspeeds, {
                                  selectClass:"input-medium",
                                selectedIndex:cameraSettings.afspeednameidx,
                                change:curry(updateCameraComboValue, cameraSettings, "afspeednameidx", "afSpeedsId")
                              }), */

            updSelectionInput2("afSpeedsId", cameraSettings.afspeeds, {
                selectedIndex:cameraSettings.afspeednameidx,
                change:curry(updateCameraComboValue, cameraSettings, "afspeednameidx", "afSpeedsId")
            }),

            /*				mkSelectionInput("AF Frame", "afFramesId", cameraSettings.afframes, {
                                  selectClass:"input-medium",
                                selectedIndex:cameraSettings.afframenameidx,
                                change:curry(updateCameraComboValue, cameraSettings, "afframenameidx", "afFramesId")
                              }) */
            updSelectionInput2("afFramesId", cameraSettings.afframes, {
                selectedIndex:cameraSettings.afframenameidx,
                change:curry(updateCameraComboValue, cameraSettings, "afframenameidx", "afFramesId")
            })
        ]);
    }
}

function mrTabContent() {
    return mkElemClass("div", "form-horizontal", [
        /*				mkSelectionInput("Mirror", "mirrorsId", cameraSettings.mirrors, {
                              selectClass:"input-medium",
                            selectedIndex:cameraSettings.mirrornameidx,
                            change:curry(updateCameraComboValue, cameraSettings, "mirrornameidx", "mirrorsId")
                          }) */
        updSelectionInput2("mirrorsId", cameraSettings.mirrors, {
            selectedIndex:cameraSettings.mirrornameidx,
            change:curry(updateCameraComboValue, cameraSettings, "mirrornameidx", "mirrorsId")
        })
    ]);
}

function updateCameraPage(nowSettings, newSettings) {
    /* update UI but not to update cameraSettings @Lawliet */
    zoomSliderUpdateVal("#zoomRangeTextId", newSettings.zoomposition);

    updatePageSettingCombobox(nowSettings, newSettings, "epModeId"         , "exposuremodeindex");
    updatePageSettingCombobox(nowSettings, newSettings, "wdrsId"           , "wdridx");
    if(cameraIsAdmin){
        updatePageSettingCombobox(nowSettings, newSettings, "wbModeId"     , "wbmodeidx");
    }
    updatePageSettingCombobox(nowSettings, newSettings, "focusAutoId"      , "focusautoidx");
    updatePageSettingCombobox(nowSettings, newSettings, "mirrorsId"        , "mirrornameidx");

    switch($('#epModeId option:selected').val()){
        case "Manual":
            updatePageSettingCombobox(nowSettings, newSettings, "gainId"        , "gainmanualidx");
            updatePageSettingCombobox(nowSettings, newSettings, "shutterSpeedId", "shuttermanualidx");
            updatePageSettingCombobox(nowSettings, newSettings, "irisesId"      , "irismanualidx");
            break;
        case "Shutter Pri":
            updatePageSettingCombobox(nowSettings, newSettings, "shutterSpeedId", "shutterpriidx");
            /* update UI but not to update cameraSettings @Lawliet */
            //updatePageSettingText(nowSettings, newSettings, "epCompLvlId"       , "exposurelevelname");
            document.getElementById("epCompLvlId").value = newSettings["exposurelevelname"];
            break;
        case "Iris Pri":
            updatePageSettingCombobox(nowSettings, newSettings, "irisesId"      , "irispriidx");
            /* update UI but not to update cameraSettings @Lawliet */
            //updatePageSettingText(nowSettings, newSettings, "epCompLvlId"       , "exposurelevelname");
            document.getElementById("epCompLvlId").value = newSettings["exposurelevelname"];
            break;
        default:
            /* update UI but not to update cameraSettings @Lawliet */
            //updatePageSettingText(nowSettings, newSettings, "epCompLvlId"       , "exposurelevelname");
            document.getElementById("epCompLvlId").value = newSettings["exposurelevelname"];
            break;
    }

    /* update the options of 3 comboboxes @Lawliet */
    /* Shutter Pri : 2 */
    nowSettings.shutterpris    = newSettings.shutterpris;
    nowSettings.shuttermanuals = newSettings.shuttermanuals;
    /* Iris Pri : 3 */
    nowSettings.irispris       = newSettings.irispris;
    nowSettings.irismanuals    = newSettings.irismanuals;
    nowSettings.irislimits     = newSettings.irislimits;
    /* Gain : 2 */
    nowSettings.gainmanuals    = newSettings.gainmanuals;
    nowSettings.gainlimits     = newSettings.gainlimits;

    updateExposureMode(nowSettings, "exposuremodeindex", "epModeId");

    if(cameraIsAdmin){
        if($('#wbModeId option:selected').val() == "Manual"){
            /* update UI but not to update cameraSettings @Lawliet */
            //updatePageSettingText(nowSettings, newSettings, "manualRedId" , "crgain");
            document.getElementById("manualRedId").value = newSettings["crgain"];
            /* update UI but not to update cameraSettings @Lawliet */
            //updatePageSettingText(nowSettings, newSettings, "manualBlueId", "cbgain");
            document.getElementById("manualBlueId").value = newSettings["cbgain"];
        }
    }

    if(cameraIsAdmin){
        updateWhiteBalanceMode(nowSettings, "wbmodeidx", "wbModeId");
    }

    switch($('#focusAutoId option:selected').val()){
        case "Manual":
            /* update UI but not to update cameraSettings @Lawliet */
            //updatePageSettingText(nowSettings, newSettings, "manualFocusRangeId", "focuspositon");
            document.getElementById("manualFocusRangeId").value = newSettings["focuspositon"];
            if ( cameraSettings.softwareversion.search("VCT") == -1) {
                updatePageSettingCombobox(nowSettings, newSettings, "afZoomTrackingId"        , "afzoomtrackingidx");
            }else{//---VC-A20P
                ;
            }

            break;
        case "Auto":
            updatePageSettingCombobox(nowSettings, newSettings, "afSensitivitiesId" , "afsensitivityidx");
            updatePageSettingCombobox(nowSettings, newSettings, "afFramesId"        , "afframenameidx");
            updatePageSettingCombobox(nowSettings, newSettings, "afSpeedsId"        , "afspeednameidx");
            break;
        default:
            break;
    }

    updateFocusAuto(nowSettings, "focusautoidx", "focusAutoId");
}

function initCameraSettings(ini) {

    return $.extend({}, ini, {
        backlights: ini.backlightname.split(/;/g),
        dynamicranges:ini.dynrangename.split(/;/g),
        fickercontrols:ini.exposurename.split(/;/g),
        whiteBalances:ini.awbname.split(/;/g),
        proirities:ini.priorityname.split(/;/g),
        imag2aTypes: ini.img2atypename.split(/;/g),
        maxexposuretimes:ini.maxexposuretimename.split(/;/g),
        maxgains:ini.maxgainname.split(/;/g),
        noisefilters:ini.nfltctrlname.split(/;/g),
        imageSensors:ini.binningname.split(/;/g),
        img2as: ini.img2aname.split(/;/g),
        exposuremodes:ini.exposuremodename.split(/;/g),
        /* Iris * 3 */
        irispris:ini.irispriname.split(/;/g),
        irismanuals:ini.irismanualname.split(/;/g),
        irislimits:ini.irislimitname.split(/;/g),
        /* Shutter * 2 */
        shutterpris:ini.shutterpriname.split(/;/g),
        shuttermanuals:ini.shuttermanualname.split(/;/g),
        /* Gain * 2 */
        gainmanuals:ini.gainmanualname.split(/;/g),
        gainlimits:ini.gainlimitname.split(/;/g),
        /*-------------------------------------------------------------*/
        wdrs:ini.wdrname.split(/;/g),
        wbmodes:ini.wbmodename.split(/;/g),
        focusautos:ini.focusautoname.split(/;/g),
        afsensitivities:ini.afsensitivityname.split(/;/g),
        afspeeds:ini.afspeedname.split(/;/g),
        afframes:ini.afframename.split(/;/g),
        afzoomtracking:ini.afzoomtrackingname.split(/;/g),
        mirrors:ini.mirrorname.split(/;/g)
    });
}

function refreshCameraPage(){
//	$.ajax({
//      url:IPNC.serverURL + 'ini.htm',
//      success: function(data) {
    document.getElementById("iniFile").onload = function(){ refreshCameraPage_onload() };
    document.getElementById("iniFile").contentWindow.location.reload();
//      	 var parsedData = parseINI(data);
//      }
//    });
}

function refreshCameraPage_onload(){
    var parsedData = parseINI(document.getElementById("iniFile").contentDocument.body.innerHTML);
    updateCameraSettings = $.extend({}, initCameraSettings(parsedData));
    var mode = parsedData.powermode;
    /* @Lawliet */
    updateCameraPage(cameraSettings, updateCameraSettings);
}

function openCamera_reload() {
    /*	var x = document.getElementById("iniFile");
        if (x.addEventListener) {                    // For all major browsers, except IE 8 and earlier
            x.addEventListener("load", openCamera);
        } else if (x.attachEvent) {                  // For IE 8 and earlier versions
            x.attachEvent("onload", openCamera);
        }
    */	document.getElementById("iniFile").onload = function(){ openCamera() };
    document.getElementById("iniFile").contentWindow.location.reload();
}

var isDirty = function() { return true; }

function openCamera() {
    timerManager.clear();

    var cameraSize = {};
    var videoSettings = {};

    /**Wales Add 20150305**/
    $(window).resize(function() {
        videoManager.stop();
        if(this.resizeTO) clearTimeout(this.resizeTO);//clean Timeout Even
        this.resizeTO = setTimeout(function() {
            $(this).trigger('resizeEnd');
        }, 500);
    });

    $(window).bind('resizeEnd', function() {
        var NewcameraSize = getPluginWidthAndHeight(cameraSettings, getMainBarHalfAvailableSpace(), 1);
        addVideoDiv(videoSettings, "#videoPlugin", NewcameraSize.width, NewcameraSize.height, "videoObj");
        playVideo(videoSettings.getStreamUrl(0));

        adjustSidebarHeight();
        showPendingStatus();
    });

//  $.ajax({
//    url:IPNC.serverURL + 'ini.htm',
//    success: function(data) {
    document.getElementById("iniFile").onload = "";
//      var parsedData = parseINI(data);
    var parsedData = parseINI(document.getElementById("iniFile").contentDocument.body.innerHTML);

    origCameraSettings = initCameraSettings(parsedData);
    cameraSettings = $.extend({}, origCameraSettings);
    videoSettings = initVideoSettings(parsedData);
    cameraSize = getPluginWidthAndHeight(cameraSettings, getMainBarHalfAvailableSpace(), 1);

    var tmp_obj = document.getElementById('divafZoomTrackingId');
    if ( cameraSettings.softwareversion.search("VCT") == -1) {
    }else{//---VC-A20P
        if(tmp_obj!=null){
            tmp_obj.style.display='none';
        }
    }

    var ptzTable = makeTable(
        [makekLabel(""),makekLabel(""),makekLabel(""),makekLabel(""),makekLabel("")],

        [
            [makekLabel(""),makekLabel(""),makekLabel(tilt),makekLabel(""),makekLabel("")],

            [makekLabel(""),
                mkHoldDownIconButton("icon-ptz-leftup"	, "Left-Up"   , "buttonUpLeft"   , upLeftAction   , ptStopAction, refreshCameraPage),
                mkHoldDownIconButton("icon-ptz-up"     , "Up"       , "buttonUp"       , upAction       , ptStopAction, refreshCameraPage),
                mkHoldDownIconButton("icon-ptz-rightup", "Right-Up"  , "buttonUpRight"  , upRightAction  , ptStopAction, refreshCameraPage),
                makekLabel("")],

            [makekLabel(pan),
                mkHoldDownIconButton("icon-ptz-left" , "Left"     , "buttonLeft"     , leftAction     , ptStopAction, refreshCameraPage),
                mkHoldDownIconButton("icon-repeat"	  , "Home"     , "buttonHome"     , homeAction     , null        , refreshCameraPage),
                mkHoldDownIconButton("icon-ptz-right", "Right"    , "buttonRight"    , rightAction    , ptStopAction, refreshCameraPage),
                makekLabel(pan)],

            [makekLabel(""),
                mkHoldDownIconButton("icon-ptz-leftdown" , "Left-Down" , "buttonDownLeft" , downLeftAction , ptStopAction, refreshCameraPage),
                mkHoldDownIconButton("icon-ptz-down"     , "Down"     , "buttonDown"     , downAction     , ptStopAction, refreshCameraPage),
                mkHoldDownIconButton("icon-ptz-rightdown", "Right-Down", "buttonDownRight", downRightAction, ptStopAction, refreshCameraPage),
                makekLabel("")],

            [makekLabel(""),makekLabel(""),makekLabel(tilt),makekLabel(""),makekLabel("")],
        ], {id:"ptzTable"}
    );

    var pstTable = makePresetTable(
        [],[],

        [
            [mkButton("1", "btn-large lumenswb2-btn-size1 btn-preset", Num1Action),
                mkButton("2", "btn-large lumenswb2-btn-size1 btn-preset", Num2Action),
                mkButton("3", "btn-large lumenswb2-btn-size1 btn-preset", Num3Action)],
            [mkButton("4", "btn-large lumenswb2-btn-size1 btn-preset", Num4Action),
                mkButton("5", "btn-large lumenswb2-btn-size1 btn-preset", Num5Action),
                mkButton("6", "btn-large lumenswb2-btn-size1 btn-preset", Num6Action)],
            [mkButton("7", "btn-large lumenswb2-btn-size1 btn-preset", Num7Action),
                mkButton("8", "btn-large lumenswb2-btn-size1 btn-preset", Num8Action),
                mkButton("9", "btn-large lumenswb2-btn-size1 btn-preset", Num9Action)],
        ], []
    );

    var btnTable = makeTable(
        [], [
            [mkButton("0"    , "btn-large lumenswb2-btn-size2 btn-preset", Num0Action),
                mkButton(clean, "btn-large lumenswb2-btn-size2 btn-preset", cleanAction)
            ],

            [mkPresetButton(save, "btn-large lumenswb2-btn-size2 btn-preset", saveAction, refreshCameraPage),
                mkPresetButton(load, "btn-large lumenswb2-btn-size2 btn-preset", loadAction, refreshCameraPage)
            ],
        ], []
    );

    var rightTable = makeTable(
        [], [
//            [mkInlineInput({id:"presetId",label:"Preset","class":"lumenswb2-input-preset", "maxlength":4, "value": "", "disabled":"disabled"})],
            [updInlineInput({id:"presetId","class":"lumenswb2-input-preset", maxlength:4, value:"", disabled:true})],
            [pstTable],
            [btnTable],
        ], {id:"rightTable"} //{tableClass: "lumenswb2-relative-left"}
    );

    var leftPanel =
        mkElem("div", {id:"leftPanel", "class":"span6"}, [
            /* @Lawliet */
            ptzTable,
            mkSpaceLarge(),mkSpaceLarge(),mkSpaceLarge(),
            rightTable,
            mkBreak(),
            slidingBtnInlineControls("zoomOutId", " ", "zoomRangeBarId", "zoomRangeTextId", "zoomInId"),
        ]);

    var rightPanel =
        mkElem("div",{id:"rightPanel", "class":"span6"},
            mkElemClass("div", "form-horizontal row-fluid",[
                centerWrap(mkElemId("div", "videoPlugin")),
            ]));

    var form = mkElemClass("div", "form-horizontal form-inline row-fluid", [leftPanel,rightPanel]);
    var formactions =
        mkElemClass("div", "form-actions", [
            mkButton(ok, "btn-primary", mkVerboseSaver(saveCameraSettings, "Camera settings saved to " + cameraSettings.cameraname, openCamera_reload)), " ",
            mkButton(cancel, "btn-normal", openCamera), " "
        ]);

    document.getElementById("saveStatusMsg").style.display = "block";
//	$("#leftPanel").replaceWith(leftPanel);
    $("#ptzTable").replaceWith(ptzTable);
    $("#rightTable").replaceWith(rightTable);
    $(".form-actions").replaceWith(formactions);
//	bindButton("okButton", mkVerboseSaver(saveCameraSettings, "Camera settings saved to " + cameraSettings.cameraname, openCamera_reload));
//	bindButton("cancelButton", openCamera);
    /*
          if(isIE(7)){
            $("#mainbar").html(mkElem(
                "div",
                {}, [
                      mkElem("h2",{},"Camera"),
                      mkUpdateModal(),
                      form,
                      mkBreak(),mkBreak(),
                      mkElem("div", {id:"cameraTabs", "class":"lumenswb2-ie7-tab-width"}),
                      mkBreak(),
                      mkSaveStatusDiv(),
                      formactions
                ]
               ));
          }else{
              $("#mainbar").html(mkElem(
                "div",
                {}, [
                      mkElem("h2",{},"Camera"),
                      mkUpdateModal(),
                      form,
                      mkBreak(),mkBreak(),
                      mkElem("div", {id:"cameraTabs", "class":"lumenswb2-tab-width"}),
                      mkBreak(),
                      mkSaveStatusDiv(),
                      formactions
                ]
               ));
          }
    */
    addVideoDiv(videoSettings, "#videoPlugin", cameraSize.width, cameraSize.height, "videoObj");
    playVideo(videoSettings.getStreamUrl(0));

    /* @Lawliet */

    if(cameraIsAdmin){
        $("#cameraTabs").html(
            mkTabbable("mainTabs", [
                {
                    label: exposure,
                    target: "epTab",
                    content:epTabContent
                },
                {
                    label: whiteBalance,
                    target: "wbTab",
                    content:wbTabContent
                },
                {
                    label: focus,
                    target: "fcTab",
                    content:fcTabContent
                },
                {
                    label: mirror,
                    target: "mrTab",
                    content:mrTabContent
                }])
        );
    }else{
        $("#cameraTabs").html(
            mkTabbable("mainTabs", [
                {
                    label: "Exposure",
                    target: "epTab",
                    content:epTabContent
                },
                {
                    label: "Focus",
                    target: "fcTab",
                    content:fcTabContent
                },
                {
                    label: "Mirror",
                    target: "mrTab",
                    content:mrTabContent
                }])
        );
    }

    /* change Image immediately but not to update cameraSettings @Lawliet */
    connectButtonToInput("#epCompLvlMinusId"       , "#epCompLvlPlusId"       , "#epCompLvlId"       , cameraSettings, "exposurelevelname", -6,   5, 1, 1, refreshCameraPage);
    connectButtonToInput("#manualRedMinusId"       , "#manualRedPlusId"       , "#manualRedId"       , cameraSettings, "crgain"           ,  0, 128, 1, 1, refreshCameraPage);
    connectButtonToInput("#manualBlueMinusId"      , "#manualBluePlusId"      , "#manualBlueId"      , cameraSettings, "cbgain"           ,  0, 128, 1, 1, refreshCameraPage);

    /* change Image immediately but not to update cameraSettings @Lawliet */
    if (( cameraSettings.softwareversion.search("VHB") != -1) || ( cameraSettings.softwareversion.search("VHR") != -1) || ( cameraSettings.softwareversion.search("VIL") != -1))
    {
        manualFocusControl("#manualFocusRangeMinusId"	 , "#manualFocusRangePlusId", "#manualFocusRangeId", cameraSettings, "focuspositon"     ,  0, 963, 1, refreshCameraPage);
        zoomRangeControl("#zoomOutId", "zoomRangeBarId", "#zoomRangeTextId", "#zoomInId", cameraSettings, "zoomposition", 1, 36, 1, refreshCameraPage);
    }
    else
    {
        manualFocusControl("#manualFocusRangeMinusId"	 , "#manualFocusRangePlusId", "#manualFocusRangeId", cameraSettings, "focuspositon"     ,  0, 258, 1, refreshCameraPage);
        zoomRangeControl("#zoomOutId", "zoomRangeBarId", "#zoomRangeTextId", "#zoomInId", cameraSettings, "zoomposition", 1, 27, 1, refreshCameraPage);
    }

    updateExposureMode(cameraSettings, "exposuremodeindex", "epModeId");
    if(cameraIsAdmin){
        updateWhiteBalanceMode(cameraSettings, "wbmodeidx", "wbModeId");
    }
    updateFocusAuto(cameraSettings, "focusautoidx", "focusAutoId");

    //$("#mainbar .nav-tabs a").tab("show");
    if (tabID) {
        var selector = "#cameraTabs a[href=" + tabID + "]";
        $(selector).tab("show");
    } else {
        $("#cameraTabs a:first").tab("show");
    }
    $('.nav-tabs a').on('shown.bs.tab', function(event){
        tabID = $(event.target).attr("href");         // active tab
    });
    //$('#cameraTabs').tabs();
    adjustSidebarHeight();
    showPendingStatus();
    if(CONTROL_WEB_2_FUNCTION.ONOFF){
        timerManager.createSeqIntervalTimer(refreshCameraPage, RefreshTime); // refreshCameraPage every 10 seconds
    }

    closeMyPage = closeCamera;
//    }
//  });//Ajax function
}

function closeCamera(afterClose) {
    if(isDifferent(origCameraSettings, cameraSettings)) {
        $(".videoContainer").hide();

        if(location.pathname.search("/tw/") != -1) {
            showConfirmationModal("訊息", "你要儲存修改嗎？", curry(saveCameraSettings, afterClose), afterClose, true);
        } else if( location.pathname.search("/zh/") != -1) {
            showConfirmationModal("讯息", "你要保存修改吗?", curry(saveCameraSettings, afterClose), afterClose, true);
        } else {
            showConfirmationModal("Message", "Do you want to save the changes?", curry(saveCameraSettings, afterClose), afterClose, true);
        }
    } else {
        afterClose();
    }
}

# Links
* http://agsh.github.io/onvif/
* http://www.onvif.org/ver20/imaging/wsdl/imaging.wsdl

# GetImagingSettings

## JSON Example

    {
        brightness: 14,
        colorSaturation: 14,
        contrast: 13,
        exposure: {
            mode: 'AUTO',
            priority: 'FrameRate',
            maxGain: 5,
            maxIris: 5,
            exposureTime: 15,
            gain: 0,
            iris: 14
        },
        focus: { autoFocusMode: 'AUTO', defaultSpeed: 1 },
        sharpness: 8,
        wideDynamicRange: { mode: 'OFF', level: 1 },
        whiteBalance: { mode: 'AUTO', crGain: 26, cbGain: 126 }
    }

## XML Example

    <SOAP-ENV:Envelope                             >
        <SOAP-ENV:Header>
            <wsse:Security>
                <wsse:UsernameToken>
                    <wsse:Username>onvif</wsse:Username>
                    <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">Rrr/oTYJtidUl/3ha6LDO/63T0o=</wsse:Password>
                    <wsse:Nonce>qPcilhC/DRjGlsjse/XBSQ==</wsse:Nonce>
                    <wsu:Created>2022-03-16T01:51:15.234Z</wsu:Created>
                </wsse:UsernameToken>
            </wsse:Security>
        </SOAP-ENV:Header>
        <SOAP-ENV:Body>
            <timg:GetImagingSettingsResponse>
                <timg:ImagingSettings>
                    <tt:Brightness>14</tt:Brightness>
                    <tt:ColorSaturation>14</tt:ColorSaturation>
                    <tt:Contrast>13</tt:Contrast>
                    <tt:Exposure>
                        <tt:Mode>AUTO</tt:Mode>
                        <tt:Priority>FrameRate</tt:Priority>
                        <tt:MaxGain>5</tt:MaxGain>
                        <tt:MaxIris>5</tt:MaxIris>
                        <tt:ExposureTime>15</tt:ExposureTime>
                        <tt:Gain>0</tt:Gain>
                        <tt:Iris>14</tt:Iris>
                    </tt:Exposure>
                    <tt:Focus>
                        <tt:AutoFocusMode>AUTO</tt:AutoFocusMode>
                        <tt:DefaultSpeed>1</tt:DefaultSpeed>
                    </tt:Focus>
                    <tt:Sharpness>8</tt:Sharpness>
                    <tt:WideDynamicRange>
                        <tt:Mode>OFF</tt:Mode>
                        <tt:Level>1</tt:Level>
                    </tt:WideDynamicRange>
                    <tt:WhiteBalance>
                        <tt:Mode>AUTO</tt:Mode>
                        <tt:CrGain>26</tt:CrGain>
                        <tt:CbGain>126</tt:CbGain>
                    </tt:WhiteBalance>
                </timg:ImagingSettings>
            </timg:GetImagingSettingsResponse>
        </SOAP-ENV:Body>
    </SOAP-ENV:Envelope>
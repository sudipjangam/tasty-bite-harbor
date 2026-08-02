package com.swadeshisolutions.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // Register custom TCP printer plugin before bridge initialises
        registerPlugin(TcpPrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

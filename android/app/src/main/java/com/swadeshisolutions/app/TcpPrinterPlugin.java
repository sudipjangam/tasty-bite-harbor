package com.swadeshisolutions.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.util.Base64;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * TcpPrinterPlugin — raw TCP socket writer for WiFi/LAN thermal printers.
 *
 * Exposed JS methods:
 *   connectAndPrint({ ip, port, data })  — fire-and-forget: open socket, write ESC/POS bytes, close
 *   testConnection({ ip, port })         — ping: open socket, close immediately (connectivity check)
 *
 * No npm package needed. Uses only java.net.Socket which is available on all Android versions.
 * INTERNET permission is already declared in AndroidManifest.xml.
 */
@CapacitorPlugin(name = "TcpPrinter")
public class TcpPrinterPlugin extends Plugin {

    private static final int CONNECT_TIMEOUT_MS = 5000; // 5 seconds
    private static final int TEST_TIMEOUT_MS    = 3000; // 3 seconds

    /**
     * connectAndPrint — open a TCP socket to the printer, stream ESC/POS bytes, then close.
     *
     * @param ip   Printer IP address (e.g. "192.168.1.100")
     * @param port Printer TCP port (default 9100)
     * @param data Base64-encoded ESC/POS byte string
     */
    @PluginMethod
    public void connectAndPrint(PluginCall call) {
        final String ip      = call.getString("ip");
        final int    port    = call.getInt("port", 9100);
        final String b64data = call.getString("data");

        if (ip == null || ip.isEmpty()) {
            call.reject("Missing printer IP address");
            return;
        }
        if (b64data == null || b64data.isEmpty()) {
            call.reject("Missing print data");
            return;
        }

        // Run on background thread — network calls must not be on main thread
        new Thread(() -> {
            try {
                byte[] data = Base64.decode(b64data, Base64.DEFAULT);

                Socket socket = new Socket();
                socket.connect(new InetSocketAddress(ip, port), CONNECT_TIMEOUT_MS);
                socket.setSoTimeout(10000); // 10s write timeout

                OutputStream out = socket.getOutputStream();
                out.write(data);
                out.flush();

                // Give printer time to process before closing connection
                Thread.sleep(200);

                socket.close();
                call.resolve();

            } catch (Exception e) {
                call.reject("TCP print failed: " + e.getMessage());
            }
        }).start();
    }

    /**
     * testConnection — verify printer is reachable on the network.
     * Opens a socket and immediately closes it. Use before saving WiFi printer config.
     *
     * @param ip   Printer IP address
     * @param port Printer TCP port (default 9100)
     */
    @PluginMethod
    public void testConnection(PluginCall call) {
        final String ip   = call.getString("ip");
        final int    port = call.getInt("port", 9100);

        if (ip == null || ip.isEmpty()) {
            call.reject("Missing printer IP address");
            return;
        }

        new Thread(() -> {
            try {
                Socket socket = new Socket();
                socket.connect(new InetSocketAddress(ip, port), TEST_TIMEOUT_MS);
                socket.close();
                call.resolve();
            } catch (Exception e) {
                call.reject("Cannot reach printer at " + ip + ":" + port + " — " + e.getMessage());
            }
        }).start();
    }
}

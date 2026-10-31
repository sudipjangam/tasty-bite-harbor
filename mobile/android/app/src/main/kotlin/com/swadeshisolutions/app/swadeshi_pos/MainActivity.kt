package com.swadeshisolutions.app.swadeshi_pos

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.pm.PackageManager
import android.os.Build
import androidx.annotation.NonNull
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.IOException
import java.io.OutputStream
import java.util.UUID
import kotlin.concurrent.thread

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.swadeshisolutions.app/bluetooth_printer"
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private val BT_PERMISSION_REQ = 1001

    private var bluetoothSocket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null
    private var pendingPermissionResult: MethodChannel.Result? = null
    private var connectionGen: Long = 0L

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == BT_PERMISSION_REQ) {
            val connectGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
            } else true
            pendingPermissionResult?.success(connectGranted)
            pendingPermissionResult = null
        }
    }

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "requestBluetoothPermissions" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        val connectGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
                        if (connectGranted) {
                            result.success(true)
                        } else {
                            pendingPermissionResult?.success(false)
                            pendingPermissionResult = result
                            ActivityCompat.requestPermissions(
                                this,
                                arrayOf(Manifest.permission.BLUETOOTH_CONNECT),
                                BT_PERMISSION_REQ
                            )
                        }
                    } else {
                        result.success(true)
                    }
                }
                "getBondedDevices" -> {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                            val connectGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
                            if (!connectGranted) {
                                result.error("PERMISSION_DENIED", "BLUETOOTH_CONNECT runtime permission not granted", null)
                                return@setMethodCallHandler
                            }
                        }

                        val adapter = BluetoothAdapter.getDefaultAdapter()
                        if (adapter == null) {
                            result.error("NO_BLUETOOTH", "Bluetooth not supported on this device", null)
                            return@setMethodCallHandler
                        }
                        val bondedDevices = adapter.bondedDevices
                        val deviceList = mutableListOf<Map<String, String>>()
                        for (device in bondedDevices) {
                            deviceList.add(mapOf(
                                "name" to (device.name ?: "Unknown Device"),
                                "address" to device.address
                            ))
                        }
                        result.success(deviceList)
                    } catch (e: SecurityException) {
                        result.error("PERMISSION_DENIED", "Bluetooth permission not granted: ${e.message}", null)
                    } catch (e: Exception) {
                        result.error("ERROR", e.message, null)
                    }
                }
                "connect" -> {
                    val address = call.argument<String>("address")
                    if (address == null) {
                        result.error("INVALID_ARG", "Device address is required", null)
                        return@setMethodCallHandler
                    }
                    val myGen = synchronized(this) { ++connectionGen }
                    thread {
                        var localSocket: BluetoothSocket? = null
                        try {
                            val adapter = BluetoothAdapter.getDefaultAdapter()
                            if (adapter == null) {
                                runOnUiThread { result.error("NO_BLUETOOTH", "Bluetooth not supported", null) }
                                return@thread
                            }
                            val device: BluetoothDevice = adapter.getRemoteDevice(address)
                            
                            // Close existing connection if any
                            synchronized(this@MainActivity) {
                                try {
                                    outputStream?.close()
                                    bluetoothSocket?.close()
                                } catch (_: Exception) {}
                                outputStream = null
                                bluetoothSocket = null
                            }

                            // Cancel discovery as it slows down connection
                            try {
                                adapter.cancelDiscovery()
                            } catch (_: Exception) {}

                            localSocket = device.createRfcommSocketToServiceRecord(SPP_UUID)
                            localSocket.connect()

                            val isCancelled = synchronized(this@MainActivity) { myGen != connectionGen }
                            if (isCancelled) {
                                try { localSocket.close() } catch (_: Exception) {}
                                runOnUiThread { result.error("CANCELLED", "Connection cancelled by disconnect", null) }
                                return@thread
                            }

                            synchronized(this@MainActivity) {
                                bluetoothSocket = localSocket
                                outputStream = localSocket.outputStream
                            }

                            runOnUiThread { result.success(true) }
                        } catch (e: Exception) {
                            try {
                                localSocket?.close()
                            } catch (_: Exception) {}
                            synchronized(this@MainActivity) {
                                if (myGen == connectionGen) {
                                    try {
                                        bluetoothSocket?.close()
                                    } catch (_: Exception) {}
                                    bluetoothSocket = null
                                    outputStream = null
                                }
                            }
                            runOnUiThread { result.error("CONNECT_FAILED", "Failed to connect: ${e.message}", null) }
                        }
                    }
                }
                "disconnect" -> {
                    try {
                        synchronized(this) {
                            connectionGen++
                            outputStream?.close()
                            bluetoothSocket?.close()
                            outputStream = null
                            bluetoothSocket = null
                        }
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("DISCONNECT_ERROR", e.message, null)
                    }
                }
                "isConnected" -> {
                    val isConn = bluetoothSocket?.isConnected == true
                    result.success(isConn)
                }
                "printBytes" -> {
                    val bytes = call.argument<ByteArray>("bytes")
                    if (bytes == null) {
                        result.error("INVALID_BYTES", "Bytes payload missing", null)
                        return@setMethodCallHandler
                    }
                    val os = outputStream
                    val sock = bluetoothSocket
                    if (sock == null || !sock.isConnected || os == null) {
                        result.error("NOT_CONNECTED", "Bluetooth printer not connected", null)
                        return@setMethodCallHandler
                    }
                    thread {
                        try {
                            os.write(bytes)
                            os.flush()
                            runOnUiThread { result.success(true) }
                        } catch (e: IOException) {
                            runOnUiThread { result.error("WRITE_ERROR", "Failed to send bytes to printer: ${e.message}", null) }
                        }
                    }
                }
                else -> result.notImplemented()
            }
        }
    }
}

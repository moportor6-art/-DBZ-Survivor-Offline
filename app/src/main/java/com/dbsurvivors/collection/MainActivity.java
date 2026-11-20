package com.dbsurvivors.collection;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Lanzador offline de los dos Dragon Ball Survivors.
 * Cada juego se sirve desde los assets en su propio dominio https://<juego>.offline/,
 * así su localStorage (partidas, Zeni, logros) queda separado y el navegador lo trata como sitio seguro.
 */
public class MainActivity extends Activity {

    private static final String SUFFIX = ".offline";
    private static final String HOME = "https://menu" + SUFFIX + "/";
    /** host (sin el sufijo) → carpeta dentro de assets/www */
    private static final Map<String, String> SITES = new HashMap<>();
    static {
        SITES.put("menu", "launcher");
        SITES.put("dbsurvivors", "dbsurvivors");
        SITES.put("dbzsurvivor", "dbzsurvivor");
    }
    private static final Map<String, String> MIME = new HashMap<>();
    static {
        MIME.put("html", "text/html");
        MIME.put("js", "text/javascript");
        MIME.put("mjs", "text/javascript");
        MIME.put("css", "text/css");
        MIME.put("json", "application/json");
        MIME.put("webmanifest", "application/manifest+json");
        MIME.put("png", "image/png");
        MIME.put("jpg", "image/jpeg");
        MIME.put("jpeg", "image/jpeg");
        MIME.put("gif", "image/gif");
        MIME.put("webp", "image/webp");
        MIME.put("svg", "image/svg+xml");
        MIME.put("ico", "image/x-icon");
        MIME.put("mp3", "audio/mpeg");
        MIME.put("ogg", "audio/ogg");
        MIME.put("wav", "audio/wav");
        MIME.put("woff2", "font/woff2");
        MIME.put("woff", "font/woff");
        MIME.put("ttf", "font/ttf");
        MIME.put("txt", "text/plain");
        MIME.put("map", "application/json");
    }

    private WebView web;
    private boolean backDialogOpen = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            w.getAttributes().layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        setContentView(web);
        hideSystemBars();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);                 // localStorage: partidas guardadas
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false); // música y efectos
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);                           // que la letra grande del sistema no rompa la interfaz
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setSupportMultipleWindows(false);           // target=_blank se abre aquí y se deriva al navegador
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.addJavascriptInterface(new GfxBridge(), "FusionNative");   // ajustes gráficos del juego (js/fusion-gfx.js)
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return serve(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (isLocal(u)) return false;
                // Enlaces externos (Ko-fi, redes, créditos): al navegador del teléfono
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) { }
                return true;
            }
        });

        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, new OnBackInvokedCallback() {
                        @Override
                        public void onBackInvoked() { handleBack(); }
                    });
        }

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(HOME);
    }

    // ─── Puente para los ajustes gráficos: frecuencia de la pantalla (60/90/120 Hz) y batería ───
    private Display display() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ? getDisplay() : getWindowManager().getDefaultDisplay();
    }

    /** Pide a la pantalla el modo con esa frecuencia (misma resolución); 0 = la más alta que tenga. */
    private void applyRefreshRate(float hz) {
        Display d = display();
        if (d == null) return;
        Display.Mode cur = d.getMode(), best = null;
        for (Display.Mode m : d.getSupportedModes()) {
            if (m.getPhysicalWidth() != cur.getPhysicalWidth() || m.getPhysicalHeight() != cur.getPhysicalHeight()) continue;
            float r = m.getRefreshRate();
            if (best == null) { best = m; continue; }
            float b = best.getRefreshRate();
            if (hz <= 0) { if (r > b) best = m; }
            else if (Math.abs(r - hz) < Math.abs(b - hz) || (Math.abs(r - hz) == Math.abs(b - hz) && r > b)) best = m;
        }
        if (best == null) return;
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.preferredDisplayModeId = best.getModeId();
        getWindow().setAttributes(lp);
    }

    private class GfxBridge {
        /** Frecuencias que admite la pantalla, p. ej. "60,90,120". */
        @JavascriptInterface
        public String refreshRates() {
            Display d = display();
            if (d == null) return "";
            Display.Mode cur = d.getMode();
            StringBuilder sb = new StringBuilder();
            for (Display.Mode m : d.getSupportedModes()) {
                if (m.getPhysicalWidth() != cur.getPhysicalWidth() || m.getPhysicalHeight() != cur.getPhysicalHeight()) continue;
                if (sb.length() > 0) sb.append(',');
                sb.append(Math.round(m.getRefreshRate()));
            }
            return sb.toString();
        }

        /** Frecuencia actual de la pantalla. */
        @JavascriptInterface
        public float currentRefreshRate() {
            Display d = display();
            return d == null ? 60 : d.getRefreshRate();
        }

        @JavascriptInterface
        public void setRefreshRate(final float hz) {
            runOnUiThread(() -> applyRefreshRate(hz));
        }

        /** "nivel,cargando": p. ej. "18,0" = 18 % sin cargador. */
        @JavascriptInterface
        public String battery() {
            BatteryManager bm = (BatteryManager) getSystemService(BATTERY_SERVICE);
            if (bm == null) return "";
            return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) + "," + (bm.isCharging() ? 1 : 0);
        }
    }

    private static boolean isLocal(Uri u) {
        String h = u.getHost();
        return h != null && h.endsWith(SUFFIX) && SITES.containsKey(h.substring(0, h.length() - SUFFIX.length()));
    }

    /** Sirve el archivo pedido desde assets/www/<juego>/; /api no existe offline (los juegos ya lo toleran). */
    private WebResourceResponse serve(Uri u) {
        if (!isLocal(u)) return null; // lo externo va a la red como siempre
        String host = u.getHost();
        String folder = SITES.get(host.substring(0, host.length() - SUFFIX.length()));
        String path = u.getPath();
        if (path == null || path.isEmpty() || path.endsWith("/")) path = (path == null ? "/" : path) + "index.html";
        if (path.contains("..") || path.startsWith("/api")) return notFound();
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase();
        String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
        try {
            InputStream in = getAssets().open("www/" + folder + path, AssetManager.ACCESS_STREAMING);
            WebResourceResponse r = new WebResourceResponse(mime,
                    mime.startsWith("text/") || mime.endsWith("json") ? "utf-8" : null, in);
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            headers.put("Access-Control-Allow-Origin", "*");
            r.setResponseHeaders(headers);
            return r;
        } catch (IOException e) {
            return notFound();
        }
    }

    private static WebResourceResponse notFound() {
        WebResourceResponse r = new WebResourceResponse("text/plain", "utf-8",
                new ByteArrayInputStream(new byte[0]));
        r.setStatusCodeAndReasonPhrase(404, "Not Found");
        return r;
    }

    /** Atrás: en el menú sale de la app; dentro de un juego pregunta antes de volver al menú. */
    private void handleBack() {
        String url = web.getUrl();
        if (url == null || url.startsWith(HOME)) {
            finish();
            return;
        }
        if (backDialogOpen) return;
        backDialogOpen = true;
        new AlertDialog.Builder(this)
                .setTitle("¿Volver al menú de juegos?")
                .setMessage("Si estás en una partida, se perderá el progreso de esa partida.")
                .setPositiveButton("Volver al menú", (d, i) -> web.loadUrl(HOME))
                .setNegativeButton("Seguir jugando", null)
                .setOnDismissListener(d -> { backDialogOpen = false; hideSystemBars(); })
                .show();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        handleBack(); // Android 12 y anteriores
    }

    @SuppressWarnings("deprecation")
    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause(); // los juegos detectan que se ocultó y pausan
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}

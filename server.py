from http.server import HTTPServer, SimpleHTTPRequestHandler

class COOPHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        super().end_headers()

HTTPServer(("0.0.0.0", 8080), COOPHandler).serve_forever()

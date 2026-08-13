"""SpotiFeel WSGI entry point.

Application behavior is composed in ``core`` while this stable module remains
the Vercel and local-development entry point.
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
from core import app
from routes.auth import bp as auth_blueprint
from routes.playback import bp as playback_blueprint
from routes.playlists import bp as playlists_blueprint
from routes.recommendations import bp as recommendations_blueprint
from routes.wrapped import bp as wrapped_blueprint

app.register_blueprint(auth_blueprint)
app.register_blueprint(playback_blueprint)
app.register_blueprint(playlists_blueprint)
app.register_blueprint(recommendations_blueprint)
app.register_blueprint(wrapped_blueprint)


if __name__ == "__main__":
    from core import BASE_DIR, DEBUG_MODE

    cert_path = BASE_DIR / "cert.pem"
    key_path = BASE_DIR / "key.pem"
    ssl_context = (str(cert_path), str(key_path)) if cert_path.exists() and key_path.exists() else None
    app.run(host="0.0.0.0", port=5001, debug=DEBUG_MODE, ssl_context=ssl_context)

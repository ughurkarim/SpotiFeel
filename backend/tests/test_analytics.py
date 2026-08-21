from app import app


def test_root_serves_one_vanilla_vercel_analytics_integration():
    app.config.update(TESTING=True)
    response = app.test_client().get("/")
    html = response.get_data(as_text=True)

    assert response.status_code == 200
    assert html.count("window.va =") == 1
    assert html.count('src="/_vercel/insights/script.js"') == 1
    assert html.index("window.va =") < html.index('src="/_vercel/insights/script.js"')

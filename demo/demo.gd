extends Node2D

func _ready() -> void:
	PausePostcard.configure("demo", "DEMO", "Pocket Garden", "1")
	PausePostcard.set_where("Greenhouse")
	var button := Button.new()
	button.text = "Make a PausePostcard"
	button.position = Vector2(30, 28)
	button.pressed.connect(PausePostcard.capture)
	add_child(button)

func _draw() -> void:
	draw_rect(Rect2(0, 0, 960, 540), Color("#24345b"))
	for i in range(14):
		draw_circle(Vector2(80 + i * 62, 300 + sin(i * 1.4) * 120), 30, Color.from_hsv(i / 14.0, 0.6, 0.94))

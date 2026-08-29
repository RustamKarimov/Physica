# Schema round trip

This non-visual Step 5 example builds a two-scene project using only public Physica package APIs. It includes an Entity with an unknown-plugin Component envelope, a System, a TextBlock Representation, and an Asset-backed Dataset. It serializes the document to canonical JSON, parses it, and verifies semantic equality and reference integrity.

The example deliberately performs no plugin execution, rendering, or physics calculation.

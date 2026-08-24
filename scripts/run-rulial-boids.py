from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "adapters" / "pcc-boids"))

from pcc_boids.rulial import main

if __name__ == "__main__":
    main()

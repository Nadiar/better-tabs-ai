#!/usr/bin/env python3
"""
Convert WebM video to optimized GIF

Requirements:
    pip install moviepy
"""

import sys
from pathlib import Path

try:
    from moviepy import VideoFileClip
except ImportError:
    try:
        from moviepy.editor import VideoFileClip
    except ImportError:
        print("Error: moviepy not installed")
        print("Install with: pip install moviepy")
        sys.exit(1)

def convert_webm_to_gif(input_path, output_path, fps=10, scale=1.0):
    """
    Convert WebM to GIF

    Args:
        input_path: Path to input WebM file
        output_path: Path for output GIF file
        fps: Frames per second for GIF (default: 10)
        scale: Scale factor (1.0 = original size, 0.5 = half size)
    """
    print(f"Converting {input_path} to GIF...")

    # Load video
    clip = VideoFileClip(str(input_path))

    # Resize if needed
    if scale != 1.0:
        clip = clip.resize(scale)

    # Write GIF
    clip.write_gif(
        str(output_path),
        fps=fps
    )

    clip.close()
    print(f"Created {output_path}")
    print(f"  Size: {Path(output_path).stat().st_size / 1024:.1f} KB")

if __name__ == "__main__":
    # Paths
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    input_file = project_dir / "screenshots" / "drag-drop-demo.webm"
    output_file = project_dir / "screenshots" / "drag-drop-demo.gif"

    if not input_file.exists():
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)

    convert_webm_to_gif(input_file, output_file, fps=10, scale=1.0)

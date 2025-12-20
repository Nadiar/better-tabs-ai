#!/usr/bin/env python3
"""
Convert WebM video to optimized APNG (Animated PNG)

APNG has better GitHub support than WebM and better quality than GIF.

Requirements:
    pip install moviepy pillow
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

from PIL import Image

def convert_webm_to_apng(input_path, output_path, fps=10, scale=1.0):
    """
    Convert WebM to APNG

    Args:
        input_path: Path to input WebM file
        output_path: Path for output APNG file
        fps: Frames per second (default: 10)
        scale: Scale factor (1.0 = original size, 0.5 = half size)
    """
    print(f"Converting {input_path} to APNG...")

    # Load video
    clip = VideoFileClip(str(input_path))

    # Resize if needed
    if scale != 1.0:
        clip = clip.resized(scale)

    # Extract frames
    frames = []
    duration_ms = int(1000 / fps)

    for frame in clip.iter_frames(fps=fps):
        # Convert numpy array to PIL Image
        img = Image.fromarray(frame)
        frames.append(img)

    clip.close()

    # Save as APNG
    if frames:
        frames[0].save(
            str(output_path),
            save_all=True,
            append_images=frames[1:],
            duration=duration_ms,
            loop=0,
            optimize=False
        )
        print(f"Created {output_path}")
        print(f"  Size: {Path(output_path).stat().st_size / 1024:.1f} KB")
        print(f"  Frames: {len(frames)}")
    else:
        print("Error: No frames extracted")
        sys.exit(1)

if __name__ == "__main__":
    # Paths
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    input_file = project_dir / "screenshots" / "drag-drop-demo.webm"
    output_file = project_dir / "screenshots" / "drag-drop-demo.png"

    if not input_file.exists():
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)

    # Try smaller scale and lower fps for reasonable file size
    print("Generating optimized APNG (scale=0.5, fps=6)...")
    convert_webm_to_apng(input_file, output_file, fps=6, scale=0.5)

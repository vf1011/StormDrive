from pathlib import Path

async def copy_name(original_name : str , num : int) -> str:
    part = Path(original_name)
    name , suffix = part.name, part.suffix
    if num == 1:
        return f"{name}(copy){suffix}"
    return f"{name}(copy {num} {suffix})"


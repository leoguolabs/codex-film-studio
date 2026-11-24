"""Copy a legacy Kokoro ONNX graph and expose its actual token-duration tensor."""
import argparse
from pathlib import Path

import onnx
from onnx import TensorProto, helper

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("original", type=Path)
parser.add_argument("copy", type=Path)
args = parser.parse_args()
if args.copy.exists() or args.original.resolve() == args.copy.resolve():
    parser.error("Choose a new filename for the timing model.")
model = onnx.load(str(args.original))
graph = model.graph
if "duration" not in {item.name for item in graph.output}:
    clock = next((node for node in graph.node if node.name == "/encoder/CumSum" and node.op_type == "CumSum"), None)
    upstream = {out: node for node in graph.node for out in node.output}
    if clock is None or upstream[clock.input[0]].op_type != "Gather":
        parser.error("The graph does not contain the expected Kokoro token clock.")
    graph.node.append(helper.make_node("Identity", [clock.input[0]], ["duration"], name="expose_token_lengths"))
    graph.output.append(helper.make_tensor_value_info("duration", TensorProto.INT64, ["token_count"]))
onnx.save(model, str(args.copy))

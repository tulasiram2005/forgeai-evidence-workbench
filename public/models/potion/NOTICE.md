The token inventory and embedding weights are derived from Minishlab potion-base-2M (MIT license), revision 389b9f64be5aa4ae7a6bc6fe95ef20ce485ae5da. This distribution quantizes each 64-component embedding to signed bytes using a per-token float32 scale. The first block in vectors.bin is the row-major byte matrix; the second is the little-endian scale array. These files are loaded only for the opt-in gate.

[Upstream model and license declaration](https://huggingface.co/minishlab/potion-base-2M/tree/389b9f64be5aa4ae7a6bc6fe95ef20ce485ae5da)

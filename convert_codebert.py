#!/usr/bin/env python3
"""
CodeBERT to ONNX Converter
Converts Microsoft's CodeBERT model to ONNX format for browser deployment
"""

import os
import sys
import json
from pathlib import Path
from typing import List, Dict, Any # Added typing for clarity

# -----------------------------
# Directory Creation
# -----------------------------
def create_directories() -> None:
    """Create necessary directories"""
    # Define directories to be created
    dirs: List[str] = ['public/models', 'public/models/quantized']
    
    for dir_path in dirs:
        # Use pathlib's Path.mkdir for creating directories
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        print(f"✓ Created directory: {dir_path}")

# -----------------------------
# Model Download & Conversion
# -----------------------------
def download_and_convert_model(model_name: str = "microsoft/codebert-base", quantize: bool = True) -> bool:
    """Download CodeBERT and convert to ONNX"""
    try:
        # Import necessary libraries inside the function to check for existence
        # This is a common pattern for scripts that rely on external libraries
        import torch
        # Note: RobertaModel is a BERT-style feature extractor. 
        # It only returns 'last_hidden_state' by default, not 'pooler_output'.
        from transformers import RobertaModel, RobertaTokenizer
        
        print(f"\n📥 Downloading {model_name} (may take a few minutes)...")
        
        # Load the model and tokenizer
        # The base RobertaModel returns a tuple (last_hidden_state, pooler_output) 
        # but pooler_output might be None if no pooling head is defined. 
        # For simple ONNX export, we'll focus on 'last_hidden_state'.
        model = RobertaModel.from_pretrained(model_name)
        tokenizer = RobertaTokenizer.from_pretrained(model_name)
        model.eval() # Set model to evaluation mode
        
        # --- Save Vocab and Config ---
        
        # 1. Save vocab
        vocab_path: str = 'public/models/vocab.json'
        # Get the vocabulary and save it as JSON
        with open(vocab_path, 'w', encoding='utf-8') as f:
            json.dump(tokenizer.get_vocab(), f, indent=2)
        print(f"✓ Vocabulary saved: {vocab_path}")
        
        # 2. Save custom tokenizer config for browser use
        config_path: str = 'public/models/tokenizer_config.json'
        
        # Create a dictionary for the essential tokenizer configuration
        config: Dict[str, Any] = {
            # Use tokenizer.vocab_size instead of calculating len()
            'vocab_size': tokenizer.vocab_size,
            'max_length': 512, # Standard max length for BERT/RoBERTa
            # Get special tokens directly from the tokenizer
            'pad_token': tokenizer.pad_token,
            'bos_token': tokenizer.bos_token,
            'eos_token': tokenizer.eos_token,
            'unk_token': tokenizer.unk_token,
            'mask_token': tokenizer.mask_token,
            # Add attention window information which is useful for CodeBERT/RoBERTa
            'model_max_length': tokenizer.model_max_length
        }
        
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
        print(f"✓ Tokenizer config saved: {config_path}")
        
        # --- Prepare Dummy Inputs and Export ---
        
        # Prepare dummy inputs
        batch_size: int = 1
        seq_length: int = 512
        # Use tokenizer.vocab_size for the upper bound of random integers
        dummy_input: torch.Tensor = torch.randint(0, tokenizer.vocab_size, (batch_size, seq_length), dtype=torch.long)
        attention_mask: torch.Tensor = torch.ones(batch_size, seq_length, dtype=torch.long)
        
        # Define the ONNX output path
        onnx_path: str = 'public/models/codebert-base.onnx'
        
        print("\n🔄 Converting to ONNX...")
        # Export to ONNX
        torch.onnx.export(
            model,
            # Pass the dummy inputs as a tuple
            (dummy_input, attention_mask), 
            onnx_path,
            input_names=['input_ids', 'attention_mask'],
            # Corrected: Only export 'last_hidden_state' for the base RobertaModel
            output_names=['last_hidden_state'], 
            # Define dynamic axes for flexible batch size and sequence length
            dynamic_axes={
                'input_ids': {0: 'batch_size', 1: 'sequence'},
                'attention_mask': {0: 'batch_size', 1: 'sequence'},
                'last_hidden_state': {0: 'batch_size', 1: 'sequence'},
                # Removed 'pooler_output' dynamic axis
            },
            # opset_version 14 is a good modern choice
            opset_version=14,
            do_constant_folding=True,
            export_params=True
        )
        
        # --- Verification and Quantization ---
        
        # Calculate file size and print success message
        file_size_mb: float = os.path.getsize(onnx_path) / (1024*1024)
        print(f"✓ ONNX model exported: {onnx_path} ({file_size_mb:.1f} MB)")
        
        # Verify ONNX model
        import onnx
        onnx_model = onnx.load(onnx_path)
        # onnx.checker.check_model raises an exception on failure
        onnx.checker.check_model(onnx_model) 
        print("✓ ONNX model verification passed")
        
        # Optional: quantization
        if quantize:
            try:
                # Import quantization tools
                from onnxruntime.quantization import quantize_dynamic, QuantType
                quant_path: str = 'public/models/codebert-base-quantized.onnx'
                
                print("\n📉 Starting dynamic quantization (CPU)...")
                # Perform dynamic quantization for smaller size
                quantize_dynamic(
                    model_input=onnx_path, # Use 'model_input' for clarity
                    model_output=quant_path, # Use 'model_output' for clarity
                    weight_type=QuantType.QUInt8,
                    optimize_model=True
                )
                
                # Calculate size reduction
                quant_size_mb: float = os.path.getsize(quant_path) / (1024*1024)
                reduction: float = ((file_size_mb - quant_size_mb) / file_size_mb) * 100
                print(f"✓ Quantized model saved: {quant_path} ({quant_size_mb:.1f} MB, {reduction:.1f}% smaller)")
            except Exception as e:
                print(f"⚠️  Quantization failed (This often happens if onnxruntime is not installed with the full package or has an older version): {e}")
        
        print("\n✅ Conversion complete!")
        print(f"Files created:")
        print(f"  - {onnx_path}")
        if quantize and 'quant_path' in locals():
            print(f"  - {quant_path}")
        print(f"  - {vocab_path}")
        print(f"  - {config_path}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during conversion: {e}")
        # Print the full traceback for detailed debugging
        import traceback
        traceback.print_exc(file=sys.stdout)
        return False

# -----------------------------
# Test ONNX Model
# -----------------------------
def test_model() -> bool:
    """Test the converted ONNX model using onnxruntime"""
    try:
        # Import onnxruntime and numpy
        import onnxruntime as ort
        import numpy as np
        
        # List model paths to test (quantized first, then unquantized)
        model_paths: List[str] = [
            'public/models/codebert-base-quantized.onnx',
            'public/models/codebert-base.onnx'
        ]
        
        success: bool = False
        for model_path in model_paths:
            # Check if the model file exists before attempting to load
            if not os.path.exists(model_path):
                continue
            
            print(f"\n🧪 Testing: {model_path}")
            # Create an inference session
            # Use CPUExecutionProvider for maximum compatibility in a script
            session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
            
            # Prepare dummy inputs matching the model's expected dynamic axes (batch_size=1, seq_length=512)
            # Input IDs are random integers, Attention mask is all ones
            input_ids = np.random.randint(0, 50265, (1, 512), dtype=np.int64)
            attention_mask = np.ones((1, 512), dtype=np.int64)
            
            # Run inference
            outputs = session.run(
                # output_names=None (returns all outputs)
                None,
                # input feed dictionary
                {'input_ids': input_ids, 'attention_mask': attention_mask}
            )
            
            # Check the shape of the main output (last_hidden_state)
            # Expected shape: (1, 512, 768)
            expected_shape = (1, 512, 768)
            if outputs[0].shape == expected_shape:
                print(f"  ✓ Model loaded and tested successfully")
                print(f"    Output shape: {outputs[0].shape}")
                print(f"    Execution providers: {session.get_providers()}")
                success = True
            else:
                print(f"  ❌ Test failed: Unexpected output shape {outputs[0].shape}. Expected {expected_shape}.")

        
        if not success:
            print("⚠️  No models found to test or test failed.")
            return False
            
        return True
    
    except Exception as e:
        print(f"\n❌ Error testing ONNX model: {e}")
        import traceback
        traceback.print_exc(file=sys.stdout)
        return False

# -----------------------------
# Main Entry
# -----------------------------
if __name__ == "__main__":
    # Create necessary directories first
    create_directories()
    
    # Download and convert the model. Exit if this step fails.
    if not download_and_convert_model():
        sys.exit(1)
    
    # Test the converted model(s)
    test_model()
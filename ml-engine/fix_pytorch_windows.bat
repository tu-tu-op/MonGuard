@echo off
echo ======================================================================
echo Fixing PyTorch Installation on Windows
echo ======================================================================
echo.

echo Creating new clean virtual environment...
if exist venv rmdir /s /q venv
python -m venv venv

echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Installing CPU-only PyTorch (more compatible on Windows)...
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

echo.
echo Installing other dependencies...
pip install numpy pandas scikit-learn networkx transformers web3 python-dotenv

echo.
echo Installing additional packages...
pip install matplotlib seaborn plotly fastapi uvicorn pytest loguru

echo.
echo Testing PyTorch installation...
python -c "import torch; print('PyTorch version:', torch.__version__); print('PyTorch working correctly!')"

echo.
echo ======================================================================
echo Setup Complete!
echo ======================================================================
echo.
echo To activate the environment in the future, run:
echo   venv\Scripts\activate.bat
echo.
echo Then run the training script:
echo   python -m training.train_risk_model
echo.
pause

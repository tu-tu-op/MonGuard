from setuptools import setup, find_packages

setup(
    name="monguard-ml",
    version="1.0.0",
    description="MonGuard ML Engine for AML and Compliance Analytics",
    author="MonGuard Team",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "torch>=2.1.0",
        "torch-geometric>=2.4.0",
        "numpy>=1.24.0",
        "pandas>=2.1.0",
        "scikit-learn>=1.3.0",
        "networkx>=3.2.1",
        "transformers>=4.35.0",
        "web3>=6.11.0",
        "fastapi>=0.104.0",
        "python-dotenv>=1.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.7.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "monguard-train=training.train_risk_model:main",
        ],
    },
)

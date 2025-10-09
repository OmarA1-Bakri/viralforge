#!/usr/bin/env python
"""
ViralForge Main Entry Point

Run with:
    crewai run
or:
    python src/viralforge/main.py
"""

import sys
from viralforge.crew import ViralForgeCrew


def run():
    """
    Run the ViralForge crew with default configuration.

    This discovers YouTube trends, analyzes them, creates viral content,
    and sets up publication and tracking strategies.
    """
    inputs = {
        'niches': 'AI, Tech, Productivity',
        'trend_data': 'Data from trend discovery'
    }

    print("=€ Starting ViralForge YouTube Viral Content System")
    print(f"=Ê Target niches: {inputs['niches']}")
    print()

    try:
        result = ViralForgeCrew().crew().kickoff(inputs=inputs)
        print()
        print(" ViralForge workflow completed successfully!")
        print()
        print("=" * 80)
        print("RESULTS:")
        print("=" * 80)
        print(result)
        return result

    except Exception as e:
        print(f"L Error running ViralForge crew: {e}")
        sys.exit(1)


def train():
    """
    Train the crew for the given number of iterations.
    """
    inputs = {
        'niches': 'AI, Tech, Productivity',
        'trend_data': 'Training data'
    }

    try:
        ViralForgeCrew().crew().train(
            n_iterations=int(sys.argv[1]) if len(sys.argv) > 1 else 10,
            inputs=inputs
        )
    except Exception as e:
        raise Exception(f"An error occurred while training the crew: {e}")


def replay():
    """
    Replay the crew execution from a specific task.
    """
    try:
        ViralForgeCrew().crew().replay(task_id=sys.argv[1])
    except Exception as e:
        raise Exception(f"An error occurred while replaying the crew: {e}")


def test():
    """
    Test the crew execution and returns the results.
    """
    inputs = {
        'niches': 'Test Niche',
        'trend_data': 'Test data'
    }

    try:
        result = ViralForgeCrew().crew().test(
            n_iterations=int(sys.argv[1]) if len(sys.argv) > 1 else 3,
            openai_model_name=sys.argv[2] if len(sys.argv) > 2 else "gpt-4o-mini",
            inputs=inputs
        )
        return result
    except Exception as e:
        raise Exception(f"An error occurred while testing the crew: {e}")


if __name__ == "__main__":
    run()

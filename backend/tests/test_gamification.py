"""Tests for gamification logic — XP, leveling, and badges."""

import pytest
from datetime import datetime, timezone, timedelta
from gamification import (
    calculate_xp,
    calculate_new_level,
    next_level_xp,
    check_badges,
    BadgeCheckResult,
    FIRST_BLOOD,
    STREAK_3,
    STREAK_7,
    MASTER_10,
    SCHOLAR_100,
    NIGHT_OWL,
)


# ─── XP Tests ────────────────────────────────────────────────────

class TestCalculateXP:
    def test_rating_1_again_with_difficulty_1(self):
        assert calculate_xp(1, difficulty_level=1) == 10  # base 5 + bonus 5

    def test_rating_2_hard_with_difficulty_1(self):
        assert calculate_xp(2, difficulty_level=1) == 15  # base 10 + bonus 5

    def test_rating_3_good_with_difficulty_1(self):
        assert calculate_xp(3, difficulty_level=1) == 25  # base 20 + bonus 5

    def test_rating_4_easy_with_difficulty_1(self):
        assert calculate_xp(4, difficulty_level=1) == 35  # base 30 + bonus 5

    def test_rating_1_default_no_bonus_zero(self):
        assert calculate_xp(1) == 10  # base 5 + default difficulty 1 bonus 5

    def test_bonus_xp_difficulty_2(self):
        assert calculate_xp(4, difficulty_level=2) == 40  # 30 base + 10 bonus

    def test_bonus_xp_difficulty_3(self):
        assert calculate_xp(4, difficulty_level=3) == 45  # 30 base + 15 bonus

    def test_bonus_capped_at_15(self):
        # Even if difficulty_level > 3, bonus can't exceed 15
        assert calculate_xp(1, difficulty_level=10) == 20  # 5 base + 15 capped

    def test_invalid_rating_returns_zero(self):
        assert calculate_xp(0, difficulty_level=1) == 0
        assert calculate_xp(5, difficulty_level=1) == 0
        assert calculate_xp(-1, difficulty_level=1) == 0


# ─── Level Tests ─────────────────────────────────────────────────

class TestNextLevelXP:
    def test_level_1_to_2(self):
        assert next_level_xp(1) == 100

    def test_level_2_to_3(self):
        assert next_level_xp(2) == 250

    def test_level_3_to_4(self):
        assert next_level_xp(3) == 500

    def test_level_10_to_11(self):
        assert next_level_xp(10) == 5050

    def test_level_50_cap_not_broken(self):
        # Formula still works at high levels
        assert next_level_xp(49) == (49 ** 2) * 50 + 50


class TestCalculateNewLevel:
    def test_no_level_up(self):
        level, gained = calculate_new_level(50, 1)
        assert level == 1
        assert gained == 0

    def test_single_level_up(self):
        # Level 1 needs 100 XP
        level, gained = calculate_new_level(100, 1)
        assert level == 2
        assert gained == 1

    def test_multi_level_jump(self):
        # 1000 XP from level 1: 100 + 250 + 500 = 850 for level 4,
        # remaining 150 is not enough for 500 needed for level 5
        level, gained = calculate_new_level(1000, 1)
        assert level == 4
        assert gained == 3

    def test_exact_threshold(self):
        level, gained = calculate_new_level(100, 1)
        assert level == 2
        assert gained == 1

    def test_level_cap_50(self):
        # Huge XP should cap at level 50
        level, gained = calculate_new_level(9999999, 1)
        assert level == 50
        assert gained == 49

    def test_already_at_max_level(self):
        level, gained = calculate_new_level(1000000, 50)
        assert level == 50
        assert gained == 0


# ─── Badge Tests ─────────────────────────────────────────────────

class TestCheckBadges:
    def test_first_blood_on_first_review(self):
        result = check_badges("user1", set(), is_first_review=True)
        assert FIRST_BLOOD in result.new_badges

    def test_first_blood_already_owned(self):
        result = check_badges("user1", {FIRST_BLOOD}, is_first_review=True)
        assert FIRST_BLOOD not in result.new_badges

    def test_first_blood_not_first_review(self):
        result = check_badges("user1", set(), is_first_review=False)
        assert FIRST_BLOOD not in result.new_badges

    def test_streak_3_reached(self):
        result = check_badges("user1", set(), streak_days=3)
        assert STREAK_3 in result.new_badges

    def test_streak_3_already_owned(self):
        result = check_badges("user1", {STREAK_3}, streak_days=5)
        assert STREAK_3 not in result.new_badges

    def test_streak_7_reached(self):
        result = check_badges("user1", set(), streak_days=7)
        assert STREAK_7 in result.new_badges
        # Also should include STREAK_3 if not owned
        assert STREAK_3 in result.new_badges

    def test_streak_3_not_reached(self):
        result = check_badges("user1", set(), streak_days=2)
        assert STREAK_3 not in result.new_badges

    def test_master_10_reached(self):
        result = check_badges("user1", set(), mastered_words=10)
        assert MASTER_10 in result.new_badges

    def test_master_10_not_reached(self):
        result = check_badges("user1", set(), mastered_words=9)
        assert MASTER_10 not in result.new_badges

    def test_scholar_100_reached(self):
        result = check_badges("user1", set(), total_reviews=100)
        assert SCHOLAR_100 in result.new_badges

    def test_scholar_100_not_reached(self):
        result = check_badges("user1", set(), total_reviews=99)
        assert SCHOLAR_100 not in result.new_badges

    def test_night_owl_night_time(self):
        result = check_badges("user1", set(), hour_of_day=23)
        assert NIGHT_OWL in result.new_badges

    def test_night_owl_early_morning(self):
        result = check_badges("user1", set(), hour_of_day=3)
        assert NIGHT_OWL in result.new_badges

    def test_night_owl_daytime_not_triggered(self):
        result = check_badges("user1", set(), hour_of_day=12)
        assert NIGHT_OWL not in result.new_badges

    def test_night_owl_already_owned(self):
        result = check_badges("user1", {NIGHT_OWL}, hour_of_day=23)
        assert NIGHT_OWL not in result.new_badges

    def test_multiple_badges_at_once(self):
        # First review at 23:00 with streak=7 should unlock multiple
        result = check_badges("user1", set(), is_first_review=True, streak_days=7, hour_of_day=23)
        assert FIRST_BLOOD in result.new_badges
        assert STREAK_3 in result.new_badges
        assert STREAK_7 in result.new_badges
        assert NIGHT_OWL in result.new_badges

    def test_badge_result_unlocked_dict(self):
        result = check_badges("user1", set(), is_first_review=True)
        assert FIRST_BLOOD in result.unlocked
        assert "reason" in result.unlocked[FIRST_BLOOD]
        assert "unlocked_at" in result.unlocked[FIRST_BLOOD]
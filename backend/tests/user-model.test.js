import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/user.model.js';

describe('User Model Unit Tests', () => {
  it('toSafeObject strips password and internal __v fields', () => {
    const rawUser = new User({
      fullName: 'Alice Walker',
      email: 'alice@example.com',
      password: 'HashedPassword123!',
      dateOfBirth: new Date('1995-05-15'),
      city: 'Berlin',
    });

    const safeObj = rawUser.toSafeObject();
    expect(safeObj.password).toBeUndefined();
    expect(safeObj.__v).toBeUndefined();
    expect(safeObj.email).toBe('alice@example.com');
    expect(safeObj.role).toBe('user');
  });

  it('default role is assigned as "user"', () => {
    const user = new User({
      fullName: 'Bob Smith',
      email: 'bob@example.com',
      password: 'ValidPassword123!',
      dateOfBirth: new Date('1990-01-01'),
      city: 'London',
    });

    expect(user.role).toBe('user');
    expect(user.isActive).toBe(true);
  });

  it('comparePassword correctly verifies matching and non-matching passwords', async () => {
    const plainPassword = 'SecretPassword123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plainPassword, salt);

    const user = new User({
      fullName: 'Charlie Brown',
      email: 'charlie@example.com',
      password: hash,
      dateOfBirth: new Date('1992-03-10'),
      city: 'Paris',
    });

    const isMatch = await user.comparePassword(plainPassword);
    const isWrong = await user.comparePassword('WrongPassword999');

    expect(isMatch).toBe(true);
    expect(isWrong).toBe(false);
  });
});


import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { getClientIp, rateLimit } from '@/lib/security';
import {
  DEMO_ACCOUNT_EMAIL,
  createLoginTicket,
  isDisposableEmail,
  isRegistrationDisabled,
  verifyCaptchaToken,
} from '@/lib/captcha';
import dns from 'dns';

const HOUR = 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    const body = await req.json();
    const { name, email, password, captchaToken, website } = body;
    const normalizedEmailEarly =
      typeof email === "string" ? email.toLowerCase().trim() : "";

    // Emergency kill switch — set DISABLE_REGISTRATION=true during an active attack
    // (demo account still allowed so demos keep working)
    if (
      isRegistrationDisabled() &&
      normalizedEmailEarly !== DEMO_ACCOUNT_EMAIL
    ) {
      return NextResponse.json(
        { message: 'Registration is temporarily disabled. Please try again later.' },
        { status: 503 }
      );
    }

    // Tight IP limit (in-memory; still helps on single-instance / sticky traffic)
    if (!rateLimit(`register:ip:${ip}`, 3, HOUR)) {
      return NextResponse.json(
        { message: 'Too many registration attempts. Try again later.' },
        { status: 429 }
      );
    }

    // Honeypot — bots often fill hidden fields; humans leave them empty
    if (typeof website === 'string' && website.trim().length > 0) {
      return NextResponse.json(
        { message: 'Registration rejected.' },
        { status: 400 }
      );
    }

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email address format' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    if (isDisposableEmail(normalizedEmail)) {
      return NextResponse.json(
        { message: 'Please use a permanent email address.' },
        { status: 400 }
      );
    }

    if (!rateLimit(`register:email:${normalizedEmail}`, 2, HOUR)) {
      return NextResponse.json(
        { message: 'Too many registration attempts. Try again later.' },
        { status: 429 }
      );
    }

    const captcha = await verifyCaptchaToken(captchaToken, {
      email: normalizedEmail,
      ip,
    });
    if (!captcha.ok) {
      return NextResponse.json(
        { message: captcha.reason || 'Captcha failed' },
        { status: 400 }
      );
    }

    try {
      dns.setDefaultResultOrder('ipv4first');
    } catch {}

    await dbConnect();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    // Extra global throttle for brand-new accounts (not demo)
    if (normalizedEmail !== DEMO_ACCOUNT_EMAIL) {
      rateLimit(`register:global:${ip}`, 5, HOUR);
    }

    return NextResponse.json(
      {
        message: 'User registered successfully',
        userId: user._id,
        // Lets the client auto-login without solving captcha twice
        loginTicket: createLoginTicket(normalizedEmail),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

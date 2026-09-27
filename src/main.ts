#!/usr/bin/env bun
import { dispatch } from "./cmd/root.ts";

process.exit(await dispatch(process.argv.slice(2)));

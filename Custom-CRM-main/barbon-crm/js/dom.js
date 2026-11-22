// Preact + htm binding. Everything imports the view layer from here so the
// vendored libraries are wired up in exactly one place.
import { h, render, Fragment, createContext } from 'preact';
import {
  useState, useEffect, useRef, useMemo, useReducer, useCallback, useContext, useLayoutEffect,
} from 'preact/hooks';
import htm from 'htm';

export const html = htm.bind(h);
export {
  h, render, Fragment, createContext,
  useState, useEffect, useRef, useMemo, useReducer, useCallback, useContext, useLayoutEffect,
};

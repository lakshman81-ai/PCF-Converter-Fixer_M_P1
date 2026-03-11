import React, { createContext, useReducer, useContext } from 'react';

const initialState = {
  dataTable: [],
  config: {
    decimals: 4,
    angleFormat: "degrees",
    pteMode: {
      autoMultiPassMode: true,
      sequentialMode: true,
      lineKeyMode: true,
      lineKeyColumn: "pipelineRef",
      boreRatioMin: 0.7,
      boreRatioMax: 1.5,
      sweepRadiusMinMultiplier: 0.2,
      sweepRadiusMax: 13000,
    },
    smartFixer: {
      connectionTolerance: 25.0,
      gridSnapResolution: 1.0,
      microPipeThreshold: 6.0,
      microFittingThreshold: 1.0,
      negligibleGap: 1.0,
      autoFillMaxGap: 25.0,
      reviewGapMax: 100.0,
      autoTrimMaxOverlap: 25.0,
      silentSnapThreshold: 2.0,
      warnSnapThreshold: 10.0,
      autoDeleteFoldbackMax: 25.0,
      offAxisThreshold: 0.5,
      diagonalMinorThreshold: 2.0,
      fittingDimensionTolerance: 0.20,
      bendRadiusTolerance: 0.05,
      minTangentMultiplier: 1.0,
      closureWarningThreshold: 5.0,
      closureErrorThreshold: 50.0,
      maxBoreForInchDetection: 48,
      oletMaxRatioWarning: 0.5,
      oletMaxRatioError: 0.8,
      branchPerpendicularityWarn: 5.0,
      branchPerpendicularityError: 15.0,
      horizontalElevationDrift: 2.0,
      minPipeRatio: 0.10,
      noSupportAlertLength: 10000.0,
    },
    pipe_OD: {},
    catalog_dimensions: {},
    valve_ftf: {},
    tee_C_dimension: {},
  },
  log: [],
  smartFix: {
    status: "idle",
    pass: 1,
    graph: null,
    chains: [],
    proposedFixes: [],
    appliedFixes: [],
    chainSummary: null,
    fixSummary: null,
  }
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_DATA_TABLE":
      return { ...state, dataTable: action.payload };
    case "SET_CONFIG":
      return { ...state, config: { ...state.config, ...action.payload } };
    case "ADD_LOG":
      return { ...state, log: [...state.log, action.payload] };
    case "CLEAR_LOG":
      return { ...state, log: [] };
    case "SET_SMART_FIX_STATUS":
      return { ...state, smartFix: { ...state.smartFix, status: action.status } };
    case "SMART_FIX_COMPLETE":
      return {
        ...state,
        smartFix: {
          ...state.smartFix,
          status: "previewing",
          graph: action.payload.graph,
          chains: action.payload.chains,
          chainSummary: action.payload.summary,
        },
        log: [...state.log]
      };
    case "FIXES_APPLIED":
      return {
        ...state,
        dataTable: action.payload.updatedTable,
        smartFix: {
          ...state.smartFix,
          status: "applied",
          appliedFixes: action.payload.applied,
          fixSummary: {
            deleteCount: action.payload.deleteCount,
            insertCount: action.payload.insertCount,
            totalApplied: action.payload.applied.length,
          },
        },
      };
    default:
      return state;
  }
}

const AppContext = createContext();

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}

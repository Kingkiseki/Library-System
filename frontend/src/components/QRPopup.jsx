import React, { useEffect, useState } from "react";
import api, {
  getStudentProfile,
  getTeacherProfile,
  borrowBookByQR,
  returnBookByQR,
  removeFine,
} from "../api";

const QRPopup = ({ qrData, onClose }) => {
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [borrowMode, setBorrowMode] = useState(false);
  const [returnMode, setReturnMode] = useState(false);
  const [bookQR, setBookQR] = useState("");
  const [returnBookQR, setReturnBookQR] = useState("");
  const [transactionInProgress, setTransactionInProgress] = useState(false); // Track if in middle of transaction
  
  // Use refs to persist state across re-renders when qrData changes
  const profileRef = React.useRef(null);
  const borrowModeRef = React.useRef(false);
  const returnModeRef = React.useRef(false);

  // Track component lifecycle
  useEffect(() => {
    console.log("🎬 QRPopup component MOUNTED");
    return () => {
      console.log("💀 QRPopup component UNMOUNTING");
    };
  }, []);

  useEffect(() => {
    if (!qrData) return;
    
    console.log("🔍 QRPopup useEffect triggered");
    console.log("📊 QRPopup received data:", qrData);
    
    // FIRST: Check refs immediately
    console.log("📊 IMMEDIATE ref check:", {
      borrowModeRef: borrowModeRef.current,
      returnModeRef: returnModeRef.current,
      hasProfileRef: !!profileRef.current,
      hasStudentProfile: !!studentProfile,
      borrowMode,
      returnMode
    });
    
    // CRITICAL: If we have a profile AND we're in borrow/return mode, DON'T process in useEffect
    // Let the keyboard handler in the component do it
    if ((borrowModeRef.current || returnModeRef.current || borrowMode || returnMode) && (profileRef.current || studentProfile)) {
      console.log("⚠️ Profile exists AND in borrow/return mode - ignoring useEffect processing");
      setLoading(false);
      return;
    }
    
    // CRITICAL: If transaction is in progress, ignore ALL new QR data
    if (transactionInProgress) {
      console.log("⚠️ BLOCKING useEffect - transaction already in progress");
      setLoading(false);
      return;
    }
    
    console.log("📊 QRPopup processing new scan (profile fetch):");
    console.log("📊 Current studentProfile state:", studentProfile ? `Profile exists (${studentProfile.borrowerType || 'unknown type'})` : "No profile");
    console.log("📊 Current borrowMode:", borrowMode);
    console.log("📊 Current returnMode:", returnMode);
    console.log("📊 Current bookQR:", bookQR);
    console.log("📊 transactionInProgress:", transactionInProgress);
    
    // Validate QR data before processing
    if (typeof qrData !== 'string' || qrData.trim().length < 10) {
      console.log("❌ Invalid QR data - too short or not a string:", qrData);
      onClose();
      return;
    }
    
    // Auto-close popup if no borrower profile is loaded within 5 seconds
    // BUT don't close if we already have a profile (we might be waiting for a book scan)
    const autoCloseTimer = setTimeout(() => {
      if (!studentProfile && !loading && !borrowMode && !returnMode) {
        console.log("⏰ Auto-closing popup - no borrower profile loaded");
        onClose();
      }
    }, 5000);
    
    // NEW: Try to parse as JSON first (for clean scanner output after factory reset)
    try {
      const parsedData = JSON.parse(qrData);
      console.log("✅ Successfully parsed JSON QR data:", parsedData);
      
      // CRITICAL CHECK: If this is a book/inventory QR and we're in transaction mode, ignore it completely
      if ((parsedData.type === "book" || parsedData.type === "inventory")) {
        if (transactionInProgress) {
          console.log("⚠️ BOOK QR DETECTED - Transaction in progress, letting keyboard listener handle it");
          console.log("⚠️ transactionInProgress:", transactionInProgress);
          setLoading(false);
          return;
        }
      }
      
      if (parsedData.type === "student") {
        console.log("📱 Detected student QR code");
        // Don't re-fetch if we already have this student's profile
        if (studentProfile?.student?._id === parsedData.studentId || 
            studentProfile?.student?.studentNumber === parsedData.studentNumber) {
          console.log("✅ Student profile already loaded, skipping fetch");
          setLoading(false);
          clearTimeout(autoCloseTimer);
          return;
        }
        if (parsedData.studentId) {
          console.log("Using studentId from JSON:", parsedData.studentId);
          fetchProfile(parsedData.studentId);
          clearTimeout(autoCloseTimer);
          return;
        } else if (parsedData.studentNumber) {
          console.log("Using studentNumber from JSON:", parsedData.studentNumber);
          fetchProfileByNumber(parsedData.studentNumber);
          clearTimeout(autoCloseTimer);
          return;
        }
      } else if (parsedData.type === "teacher") {
        console.log("🎓 Detected teacher QR code");
        console.log("🎓 Current state before teacher fetch:", {
          hasStudentProfile: !!studentProfile,
          hasTeacherInProfile: !!studentProfile?.teacher,
          currentTeacherId: studentProfile?.teacher?._id,
          scannedTeacherId: parsedData.teacherId
        });
        // Don't re-fetch if we already have this teacher's profile
        if (studentProfile?.teacher?._id === parsedData.teacherId) {
          console.log("✅ Teacher profile already loaded, skipping fetch");
          setLoading(false);
          clearTimeout(autoCloseTimer);
          return;
        }
        if (parsedData.teacherId) {
          console.log("Using teacherId from JSON:", parsedData.teacherId);
          fetchTeacherProfile(parsedData.teacherId);
          clearTimeout(autoCloseTimer);
          return;
        }
      } else if (parsedData.type === "book" || parsedData.type === "inventory") {
        console.log("📚 IGNORING book/inventory QR in main useEffect - keyboard listener will handle it");
        console.log("📚 State check:", { 
          borrowMode, 
          returnMode, 
          borrowModeRef: borrowModeRef.current, 
          returnModeRef: returnModeRef.current 
        });
        // CRITICAL: Do NOT process book QRs in useEffect - let the dedicated keyboard scanner handle them
        // This prevents qrData changes from retriggering useEffect and causing state conflicts
        setLoading(false);
        clearTimeout(autoCloseTimer);
        return;
      }
    } catch (e) {
      console.log("❌ Not valid JSON, trying legacy scanner format parsing...");
      
      // Additional validation for legacy formats
      if (!qrData.includes('@') && !qrData.includes('*') && !qrData.includes('^') && !qrData.includes('Student') && !qrData.includes('Book')) {
        console.log("❌ QR data doesn't match any known format (JSON, legacy, or text):", qrData);
        onClose();
        return;
      }
    }
    
    // LEGACY: Handle corrupted scanner formats (fallback for old scanner data)
    let cleanedQRData = qrData;
    
    console.log("Raw scanner input:", qrData);
    console.log("Trying to parse legacy scanner format...");
    
    let parts = [];
    
    // Try the @?@@^@ format first
    if (qrData.includes('@?@@^@')) {
      parts = qrData.split(/@\?@@\^@/);
      console.log("Using @?@@^@ format, split parts:", parts);
    } 
    // Try *^* format (common for this scanner)
    else if (qrData.includes('*^*')) {
      parts = qrData.split(/\*\^\*/);
      console.log("Using *^* format, split parts:", parts);
    }
    // Fallback: split by common delimiters
    else {
      parts = qrData.split(/[\*@\^\?]+/);
      console.log("Using fallback split, parts:", parts);
    }
    
    // Clean each part more aggressively
    const cleanedParts = parts.map(part => 
      part.replace(/@@\^@@\?@@\^@/g, '')
          .replace(/@@\^@@/g, '')
          .replace(/@\?@@\^@/g, '')
          .replace(/\*\^\*/g, '')
          .replace(/@/g, '')
          .replace(/\^/g, '')
          .replace(/\?/g, '')
          .replace(/\*/g, '')
          .trim()
    ).filter(part => part.length > 0);
    
    console.log("Cleaned parts:", cleanedParts);
    
    // Try to identify student data from the parts
    let mongoId = null;
    let studentNumber = null;
    let physicalId = null;
    
    cleanedParts.forEach(part => {
      console.log(`Analyzing part: "${part}" (length: ${part.length})`);
      
      // Check if it looks like a MongoDB ObjectId (24 hex chars)
      if (part.length === 24 && /^[0-9a-fA-F]+$/.test(part)) {
        mongoId = part;
        console.log("Found MongoDB ID:", mongoId);
      }
      // Check if it looks like a student number (YYYY-NNNN)
      else if (part.match(/^\d{4}-\d{4}$/)) {
        studentNumber = part;
        console.log("Found student number:", studentNumber);
      }
      // Check if it's a long numeric string (could be physicalId)
      else if (part.length >= 15 && /^\d+$/.test(part)) {
        physicalId = part;
        console.log("Found potential physical ID:", physicalId);
      }
      // Check if it's a shorter numeric string (could be book ID or other identifier)  
      else if (part.length >= 4 && /^\d+$/.test(part)) {
        console.log("Found short numeric identifier:", part);
      }
      // Check if it might be a year-only that needs formatting
      else if (part.match(/^\d{4}$/)) {
        const currentYear = new Date().getFullYear();
        if (parseInt(part) >= 2020 && parseInt(part) <= currentYear + 2) {
          console.log("Found potential year part:", part);
        }
      }
    });
    
    // Also try the original cleaning method as fallback
    cleanedQRData = qrData.replace(/@@\^@@\?@@\^@/g, '')
                         .replace(/@\?@@\^@/g, '')
                         .replace(/@/g, '')
                         .replace(/\^/g, '')
                         .replace(/\?/g, '')
                         .replace(/\*/g, '')
                         .trim();
    
    console.log("Cleaned QR data:", cleanedQRData);
    
    // First try using the extracted parts in order of preference
    if (studentNumber) {
      console.log("Using extracted student number:", studentNumber);
      fetchProfileByNumber(studentNumber);
      return;
    } else if (mongoId) {
      console.log("Using extracted MongoDB ID:", mongoId);
      fetchProfile(mongoId);
      return;
    } else if (physicalId) {
      console.log("Using extracted physical ID:", physicalId);
      fetchProfileByPhysicalId(physicalId);
      return;
    }
    
    // Fallback to JSON parsing
    try {
      const parsed = JSON.parse(cleanedQRData);
      console.log("Parsed QR data:", parsed);
      if (parsed.type === "student") {
        if (parsed.studentId) {
          console.log("Valid student QR detected, fetching profile by ID:", parsed.studentId);
          fetchProfile(parsed.studentId);
        } else if (parsed.studentNumber) {
          console.log("Valid student QR detected, fetching profile by number:", parsed.studentNumber);
          fetchProfileByNumber(parsed.studentNumber);
        } else {
          console.log("QR data does not contain valid student information");
          // Don't reset student profile if we're in borrow mode (might be scanning a book)
          if (!borrowMode) {
            setStudentProfile(null);
          }
          setLoading(false);
        }
      } else {
        console.log("QR data does not contain valid student information");
        // Don't reset student profile if we're in borrow mode (might be scanning a book)
        if (!borrowMode) {
          setStudentProfile(null);
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("JSON parsing failed, trying as raw student number:", error);
      console.log("Raw QR data:", qrData);
      console.log("Cleaned QR data:", cleanedQRData);
      
      // If JSON parsing fails, try to extract student data from corrupted input
      console.log("Attempting to extract student data from:", cleanedQRData);
      
      // First, try to extract student number pattern (YYYY-NNNN)
      const studentNumberMatch = cleanedQRData.match(/(\d{4}-\d{4})/);
      if (studentNumberMatch) {
        const studentNumber = studentNumberMatch[1];
        console.log("Found student number pattern:", studentNumber);
        fetchProfileByNumber(studentNumber);
        return;
      }
      
      // Try to use the cleaned data as a physical ID (for raw scanner data)
      const possiblePhysicalId = cleanedQRData;
      if (possiblePhysicalId && possiblePhysicalId.length >= 10) {
        console.log("Trying as physical ID:", possiblePhysicalId);
        fetchProfileByPhysicalId(possiblePhysicalId);
        return;
      }
      
      // Try to extract and format numbers as student number
      const numbersOnly = cleanedQRData.replace(/\D/g, '');
      console.log("Numbers only from QR:", numbersOnly);
      
      if (numbersOnly.length >= 4) {
        const currentYear = new Date().getFullYear();
        let formattedStudentNumber;
        
        // Try different patterns
        if (numbersOnly.length >= 8) {
          // Might be like "20250001" -> "2025-0001"
          const year = numbersOnly.slice(0, 4);
          const number = numbersOnly.slice(4, 8);
          formattedStudentNumber = `${year}-${number}`;
        } else if (numbersOnly.length === 4) {
          // Might be just "0001" -> "2025-0001"
          formattedStudentNumber = `${currentYear}-${numbersOnly}`;
        } else {
          // Pad and format
          const paddedNumber = numbersOnly.padStart(4, '0').slice(-4);
          formattedStudentNumber = `${currentYear}-${paddedNumber}`;
        }
        
        console.log("Formatted as student number:", formattedStudentNumber);
        fetchProfileByNumber(formattedStudentNumber);
      } else {
        console.log("Could not identify valid student data");
        // Don't reset student profile if we're in borrow mode (might be scanning a book)
        if (!borrowMode) {
          console.log("🛡️ Not in borrow mode, resetting student profile");
          setStudentProfile(null);
        } else {
          console.log("🛡️ In borrow mode, preserving student profile");
        }
        setLoading(false);
      }
    }
    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [qrData]);

  // Debug: Watch bookQR state changes
  useEffect(() => {
    if (bookQR) {
      console.log("🎯 BOOK QR STATE CHANGED!");
      console.log("🎯 New bookQR value:", bookQR);
      console.log("🎯 bookQR length:", bookQR.length);
      console.log("🎯 bookQR type:", typeof bookQR);
      try {
        const parsed = JSON.parse(bookQR);
        console.log("🎯 Parsed bookQR:", parsed);
      } catch (e) {
        console.log("🎯 bookQR is not JSON:", e.message);
      }
    }
  }, [bookQR]);

  // Global book QR scanner listener when in borrow mode
  useEffect(() => {
    if (!borrowMode) return;

    let buffer = "";
    let scannerTimeout;

    const handleBookKeyDown = (e) => {
      // GUARD: Only check borrowMode - transactionInProgress is for useEffect, not keyboard scanner
      if (!borrowMode) {
        console.log("⚠️ Book scanner blocked - not in borrow mode");
        return;
      }
      
      // Don't process if we already have a book QR scanned
      if (bookQR) {
        console.log("⚠️ Book scanner blocked - bookQR already set:", bookQR);
        return;
      }
      
      // Prevent default browser behavior for printable characters
      if (e.key.length === 1) {
        e.preventDefault();
      }
      
      // Clear timeout on any key press
      if (scannerTimeout) {
        clearTimeout(scannerTimeout);
      }

      if (e.key === "Enter") {
        if (buffer.trim() !== "" && buffer.length > 5) {
          const trimmedBuffer = buffer.trim();
          console.log("📚 Book QR Scanner - Raw input:", trimmedBuffer);
          console.log("📚 Book QR Scanner - Input length:", trimmedBuffer.length);
          
          // Clean up scanner artifacts before parsing
          let cleanedData = trimmedBuffer;
          
          // Remove scanner artifacts at start and end ONLY, preserve JSON content
          cleanedData = cleanedData.replace(/^[@\*\^\?]+/, ''); // Remove artifacts at start
          cleanedData = cleanedData.replace(/[@\*\^\?]+$/, ''); // Remove artifacts at end
          
          // If it looks like JSON, find the actual JSON boundaries
          const jsonStart = cleanedData.indexOf('{');
          const jsonEnd = cleanedData.lastIndexOf('}');
          
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            cleanedData = cleanedData.substring(jsonStart, jsonEnd + 1);
          }
          
          console.log("📚 Book QR Scanner - Cleaned input:", cleanedData);
          
          // NEW: Try to parse as JSON first (clean scanner after factory reset)
          try {
            const parsedData = JSON.parse(cleanedData);
            console.log("✅ Book QR Scanner - Successfully parsed JSON:", parsedData);
            
            if (parsedData.type === "book" || parsedData.type === "inventory") {
              console.log("📚 Book QR Scanner - Detected book/inventory QR code");
              console.log("📚 Inventory details:", {
                inventoryItemId: parsedData.inventoryItemId,
                inventoryType: parsedData.inventoryType,
                title: parsedData.title,
                author: parsedData.author
              });
              
              // Check if we're in return mode
              if (returnMode) {
                console.log("📚 Book Scanner - In return mode - setting returnBookQR");
                setReturnBookQR(JSON.stringify(parsedData));
              } else {
                console.log("📚 Book Scanner - In borrow mode - setting bookQR");
                setBookQR(JSON.stringify(parsedData));
              }
              
              console.log("✅ BookQR state set with JSON data");
              buffer = "";
              return;
            } else {
              console.log("⚠️ Parsed JSON but type is not book/inventory:", parsedData.type);
            }
          } catch (e) {
            console.log("❌ Book QR Scanner - JSON parse error:", e.message);
            console.log("📚 Book QR Scanner - Trying legacy parsing...");
          }
          
          // LEGACY: Handle corrupted scanner format for books: @@^@@?@@^@68349212827276793@?@@^@@?@@^@12345@?@@^@@
          console.log("Book QR Scanner - Raw input:", trimmedBuffer);
          
          // Extract data parts between the scanner delimiters
          const parts = trimmedBuffer.split(/@\?@@\^@/);
          console.log("Book QR Scanner - Split parts:", parts);
          
          // Clean each part and find potential book IDs
          const cleanedParts = parts.map(part => 
            part.replace(/@@\^@@\?@@\^@/g, '')
                .replace(/@@\^@@/g, '')
                .replace(/@\?@@\^@/g, '')
                .replace(/@/g, '')
                .replace(/\^/g, '')
                .replace(/\?/g, '')
                .replace(/\*/g, '')
                .trim()
          ).filter(part => part.length > 0);
          
          console.log("Book QR Scanner - Cleaned parts:", cleanedParts);
          
          // Find the best book ID candidate
          let bestBookId = null;
          
          cleanedParts.forEach(part => {
            // Prefer longer IDs that look like MongoDB ObjectIds or physicalIds
            if (part.length >= 17 && /^[0-9a-fA-F]+$/.test(part)) {
              if (!bestBookId || part.length > bestBookId.length) {
                bestBookId = part;
                console.log("Book QR Scanner - Found potential book ID:", bestBookId);
              }
            }
          });
          
          // If no long ID found, use the longest numeric part
          if (!bestBookId && cleanedParts.length > 0) {
            bestBookId = cleanedParts.reduce((a, b) => a.length > b.length ? a : b, '');
            console.log("Book QR Scanner - Using longest part as book ID:", bestBookId);
          }
          
          if (bestBookId && bestBookId.length > 5) {
            console.log("✅ Book QR Scanner - Using book ID:", bestBookId);
            console.log("📋 Setting bookQR state to:", bestBookId);
            
            // Check if we're in return mode
            if (returnMode) {
              console.log("📚 Legacy Scanner - In return mode - setting returnBookQR");
              setReturnBookQR(bestBookId);
            } else {
              console.log("📚 Legacy Scanner - In borrow mode - setting bookQR");
              setBookQR(bestBookId);
            }
            
            console.log("✅ BookQR state should now be set. This should trigger the success UI.");
          } else {
            console.error("❌ Could not extract valid book ID from parts:", cleanedParts);
            alert("Invalid book QR code format. Please try scanning again.");
          }
          
          buffer = "";
        }
      } else if (e.key.length === 1) { // Only capture printable characters
        buffer += e.key;
        
        // Auto-clear buffer after 100ms of no input (scanner inputs are very fast)
        scannerTimeout = setTimeout(() => {
          buffer = "";
        }, 100);
      }
    };

    console.log("📚 Book keyboard listener mounted - borrowMode:", borrowMode, "bookQR:", bookQR);
    document.addEventListener("keydown", handleBookKeyDown);
    return () => {
      console.log("📚 Book keyboard listener unmounted");
      document.removeEventListener("keydown", handleBookKeyDown);
      if (scannerTimeout) clearTimeout(scannerTimeout);
    };
  }, [borrowMode, bookQR]); // Re-mount when borrowMode or bookQR changes

  // Global book QR scanner listener when in return mode
  useEffect(() => {
    if (!returnMode) return;

    let buffer = "";
    let scannerTimeout;

    const handleReturnBookKeyDown = (e) => {
      // GUARD: Only check returnMode - transactionInProgress is for useEffect, not keyboard scanner
      if (!returnMode) {
        console.log("⚠️ Return scanner blocked - not in return mode");
        return;
      }
      
      // Don't process if we already have a return book QR scanned
      if (returnBookQR) {
        console.log("⚠️ Return scanner blocked - returnBookQR already set:", returnBookQR);
        return;
      }
      
      // Prevent default browser behavior for printable characters
      if (e.key.length === 1) {
        e.preventDefault();
      }
      
      // Clear timeout on any key press
      if (scannerTimeout) {
        clearTimeout(scannerTimeout);
      }

      if (e.key === "Enter") {
        if (buffer.trim() !== "" && buffer.length > 5) {
          const trimmedBuffer = buffer.trim();
          console.log("📖 Return Book QR Scanner - Raw input:", trimmedBuffer);
          console.log("📖 Return Book QR Scanner - Input length:", trimmedBuffer.length);
          
          // Clean up scanner artifacts before parsing
          let cleanedData = trimmedBuffer;
          
          // Remove scanner artifacts at start and end ONLY, preserve JSON content
          cleanedData = cleanedData.replace(/^[@\*\^\?]+/, ''); // Remove artifacts at start
          cleanedData = cleanedData.replace(/[@\*\^\?]+$/, ''); // Remove artifacts at end
          
          // If it looks like JSON, find the actual JSON boundaries
          const jsonStart = cleanedData.indexOf('{');
          const jsonEnd = cleanedData.lastIndexOf('}');
          
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            cleanedData = cleanedData.substring(jsonStart, jsonEnd + 1);
          }
          
          console.log("📖 Return Book QR Scanner - Cleaned input:", cleanedData);
          
          // Try to parse as JSON first
          try {
            const parsedData = JSON.parse(cleanedData);
            console.log("✅ Return Book QR Scanner - Successfully parsed JSON:", parsedData);
            
            if (parsedData.type === "book" || parsedData.type === "inventory") {
              console.log("📖 Return Book QR Scanner - Detected book/inventory QR code");
              console.log("📖 Inventory details:", {
                inventoryItemId: parsedData.inventoryItemId,
                inventoryType: parsedData.inventoryType,
                title: parsedData.title,
                author: parsedData.author
              });
              
              setReturnBookQR(JSON.stringify(parsedData));
              console.log("✅ ReturnBookQR state set with JSON data");
              buffer = "";
              return;
            }
          } catch (e) {
            console.log("❌ Return Book QR Scanner - JSON parse error:", e.message);
            console.log("📖 Return Book QR Scanner - Trying legacy parsing...");
          }
          
          // Legacy format handling
          console.log("📖 Return Book QR Scanner - Processing legacy format");
          
          // Extract data parts between the scanner delimiters
          const parts = trimmedBuffer.split(/@\?@@\^@/);
          console.log("Return Book QR Scanner - Split parts:", parts);
          
          // Clean each part and find potential book IDs
          const cleanedParts = parts.map(part => 
            part.replace(/@@\^@@\?@@\^@/g, '')
                .replace(/@@\^@@/g, '')
                .replace(/@\?@@\^@/g, '')
                .replace(/@/g, '')
                .replace(/\^/g, '')
                .replace(/\?/g, '')
                .replace(/\*/g, '')
                .trim()
          ).filter(part => part.length > 0);
          
          console.log("Return Book QR Scanner - Cleaned parts:", cleanedParts);
          
          // Find the best book ID candidate
          let bestBookId = null;
          
          cleanedParts.forEach(part => {
            // Prefer longer IDs that look like MongoDB ObjectIds or physicalIds
            if (part.length >= 17 && /^[0-9a-fA-F]+$/.test(part)) {
              if (!bestBookId || part.length > bestBookId.length) {
                bestBookId = part;
                console.log("Return Book QR Scanner - Found potential book ID:", bestBookId);
              }
            }
          });
          
          // If no long ID found, use the longest numeric part
          if (!bestBookId && cleanedParts.length > 0) {
            bestBookId = cleanedParts.reduce((a, b) => a.length > b.length ? a : b, '');
            console.log("Return Book QR Scanner - Using longest part as book ID:", bestBookId);
          }
          
          if (bestBookId && bestBookId.length > 5) {
            console.log("Return Book QR Scanner - Using book ID:", bestBookId);
            setReturnBookQR(bestBookId);
          } else {
            console.error("Could not extract valid book ID from parts:", cleanedParts);
            alert("Invalid book QR code format. Please try scanning again.");
          }
          
          buffer = "";
        }
      } else if (e.key.length === 1) { // Only capture printable characters
        buffer += e.key;
        
        // Auto-clear buffer after 100ms of no input (scanner inputs are very fast)
        scannerTimeout = setTimeout(() => {
          buffer = "";
        }, 100);
      }
    };

    console.log("📖 Return keyboard listener mounted - returnMode:", returnMode, "returnBookQR:", returnBookQR);
    document.addEventListener("keydown", handleReturnBookKeyDown);
    return () => {
      console.log("📖 Return keyboard listener unmounted");
      document.removeEventListener("keydown", handleReturnBookKeyDown);
      if (scannerTimeout) clearTimeout(scannerTimeout);
    };
  }, [returnMode, returnBookQR]); // Re-mount when returnMode or returnBookQR changes

  const fetchProfile = async (id) => {
    console.log("Fetching profile for student ID:", id);
    setLoading(true);
    // Reset all modes and book data when loading new profile
    setBorrowMode(false);
    setReturnMode(false);
    borrowModeRef.current = false;
    returnModeRef.current = false;
    setBookQR("");
    setReturnBookQR("");
    setTransactionInProgress(false);
    try {
      const res = await getStudentProfile(id);
      console.log("Student profile response:", res.data);
      console.log("Borrowed books structure:", res.data.borrowedBooks);
      if (res.data.borrowedBooks && res.data.borrowedBooks.length > 0) {
        console.log("First borrowed book details:", res.data.borrowedBooks[0]);
      }
      setStudentProfile(res.data);
      profileRef.current = res.data; // Persist in ref
      
      // Don't auto-enable borrow mode - let user choose between borrow/return
      console.log("✅ Student profile loaded - waiting for user to choose action");
    } catch (err) {
      console.error("Error fetching profile:", err.response?.data || err);
      console.log("Full error:", err);
      setStudentProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileByNumber = async (studentNumber) => {
    console.log("Fetching profile for student number:", studentNumber);
    setLoading(true);
    try {
      // First find the student by number to get their ID
      const studentsRes = await api.get("/students");
      const student = studentsRes.data.find(s => s.studentNumber === studentNumber);
      
      if (student) {
        console.log("Found student by number:", student);
        // Reset all modes and book data when loading new profile
        setBorrowMode(false);
        setReturnMode(false);
        borrowModeRef.current = false;
        returnModeRef.current = false;
        setBookQR("");
        setReturnBookQR("");
        setTransactionInProgress(false);
        const res = await getStudentProfile(student._id);
        console.log("Student profile response:", res.data);
        setStudentProfile(res.data);
        profileRef.current = res.data; // Persist in ref
        
        // Don't auto-enable borrow mode - let user choose between borrow/return
        console.log("✅ Student profile loaded - waiting for user to choose action");
      } else {
        console.log("Student not found with number:", studentNumber);
        setStudentProfile(null);
      }
    } catch (err) {
      console.error("Error fetching profile by number:", err.response?.data || err);
      console.log("Full error:", err);
      setStudentProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileByPhysicalId = async (physicalId) => {
    console.log("🔍 Fetching profile for physical ID:", physicalId);
    console.log("🔍 Physical ID type:", typeof physicalId);
    setLoading(true);
    try {
      // Find the student by physicalId
      const studentsRes = await api.get("/students");
      console.log("📊 All students from API:", studentsRes.data);
      
      // Debug each student
      studentsRes.data.forEach((s, index) => {
        console.log(`🧑‍🎓 Student ${index + 1}:`, {
          name: s.fullName,
          physicalId: s.physicalId,
          physicalIdType: typeof s.physicalId,
          matches: s.physicalId === physicalId,
          looseMathces: s.physicalId == physicalId,
          stringComparison: `"${s.physicalId}" === "${physicalId}"`
        });
      });
      
      // Normalize both strings to handle potential invisible characters
      const normalizedPhysicalId = physicalId.toString().trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
      console.log("🔧 Normalized search ID:", normalizedPhysicalId);
      console.log("🔧 Search ID bytes:", Array.from(normalizedPhysicalId).map(c => c.charCodeAt(0)));
      
      const student = studentsRes.data.find(s => {
        if (!s.physicalId || s.physicalId === undefined || s.physicalId === null) {
          console.log("⚠️ Skipping student with undefined/null physicalId:", s.fullName);
          return false;
        }
        
        const normalizedDbId = s.physicalId.toString().trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
        console.log("🔧 Comparing with DB ID:", normalizedDbId);
        console.log("🔧 DB ID bytes:", Array.from(normalizedDbId).map(c => c.charCodeAt(0)));
        
        // Try multiple comparison methods
        const exactMatch = normalizedDbId === normalizedPhysicalId;
        const looseMatch = normalizedDbId == normalizedPhysicalId;
        const includesMatch = normalizedDbId.includes(normalizedPhysicalId);
        const reverseIncludesMatch = normalizedPhysicalId.includes(normalizedDbId);
        
        console.log("🔧 Exact match (===):", exactMatch);
        console.log("🔧 Loose match (==):", looseMatch);
        console.log("🔧 DB includes search:", includesMatch);
        console.log("🔧 Search includes DB:", reverseIncludesMatch);
        
        // Force match for debugging - if bytes are identical, it should match
        const searchBytes = Array.from(normalizedPhysicalId).map(c => c.charCodeAt(0));
        const dbBytes = Array.from(normalizedDbId).map(c => c.charCodeAt(0));
        
        console.log("🔧 Search bytes:", searchBytes);
        console.log("🔧 DB bytes:", dbBytes);
        
        // Direct array comparison
        let bytesMatch = false;
        if (searchBytes.length === dbBytes.length) {
          bytesMatch = searchBytes.every((byte, index) => byte === dbBytes[index]);
        }
        console.log("🔧 Direct bytes match:", bytesMatch);
        
        // Also try JSON stringify comparison
        const jsonBytesMatch = JSON.stringify(searchBytes) === JSON.stringify(dbBytes);
        console.log("🔧 JSON bytes match:", jsonBytesMatch);
        
        // If either bytes match method works, force return true
        if (bytesMatch || jsonBytesMatch) {
          console.log("🎯 BYTES MATCH DETECTED - returning true!");
          return true;
        }
        
        // Also try direct string comparison after removing all possible hidden chars
        const cleanSearchId = normalizedPhysicalId.replace(/[^\x20-\x7E]/g, '');
        const cleanDbId = normalizedDbId.replace(/[^\x20-\x7E]/g, '');
        console.log("🔧 ASCII-only search ID:", cleanSearchId);
        console.log("🔧 ASCII-only DB ID:", cleanDbId);
        const asciiMatch = cleanSearchId === cleanDbId;
        console.log("🔧 ASCII match:", asciiMatch);
        
        if (asciiMatch) {
          console.log("🎯 ASCII MATCH DETECTED - returning true!");
          return true;
        }
        
        // Try flexible matching - check if one contains the other (handles scanner corruption)
        const flexibleMatch1 = cleanSearchId.includes(cleanDbId) && cleanDbId.length >= 15;
        const flexibleMatch2 = cleanDbId.includes(cleanSearchId) && cleanSearchId.length >= 15;
        console.log("🔧 Flexible match 1 (search includes DB):", flexibleMatch1);
        console.log("🔧 Flexible match 2 (DB includes search):", flexibleMatch2);
        
        if (flexibleMatch1 || flexibleMatch2) {
          console.log("🎯 FLEXIBLE MATCH DETECTED - returning true!");
          return true;
        }
        
        // Try prefix matching for long IDs (handles truncation)
        const prefixMatch = cleanSearchId.length >= 15 && cleanDbId.length >= 15 && 
                           (cleanSearchId.startsWith(cleanDbId) || cleanDbId.startsWith(cleanSearchId));
        console.log("🔧 Prefix match:", prefixMatch);
        
        if (prefixMatch) {
          console.log("🎯 PREFIX MATCH DETECTED - returning true!");
          return true;
        }
        
        return exactMatch || looseMatch;
      });
      
      if (student) {
        console.log("✅ Found student by physical ID:", student);
        const res = await getStudentProfile(student._id);
        console.log("Student profile response:", res.data);
        setStudentProfile(res.data);
      } else {
        console.log("❌ Student not found with physical ID:", physicalId);
        console.log("❌ Available physical IDs:", studentsRes.data.map(s => s.physicalId));
        // Don't reset student profile if we're in borrow mode (might be scanning a book)
        if (!borrowMode) {
          setStudentProfile(null);
        } else {
          console.log("🛡️ In borrow mode, preserving student profile during book scan");
        }
      }
    } catch (err) {
      console.error("Error fetching profile by physical ID:", err.response?.data || err);
      console.log("Full error:", err);
      // Don't reset student profile if we're in borrow mode (might be scanning a book)
      if (!borrowMode) {
        setStudentProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherProfile = async (teacherId) => {
    console.log("Fetching profile for teacher ID:", teacherId);
    setLoading(true);
    // Reset all modes and book data when loading new profile
    setBorrowMode(false);
    setReturnMode(false);
    borrowModeRef.current = false;
    returnModeRef.current = false;
    setBookQR("");
    setReturnBookQR("");
    setTransactionInProgress(false);
    try {
      const res = await getTeacherProfile(teacherId);
      console.log("Teacher profile response:", res.data);
      console.log("Borrowed books structure:", res.data.borrowedBooks);
      if (res.data.borrowedBooks && res.data.borrowedBooks.length > 0) {
        console.log("First borrowed book details:", res.data.borrowedBooks[0]);
      }
      // Add borrowerType to the profile data
      const profileWithType = { ...res.data, borrowerType: "teacher" };
      setStudentProfile(profileWithType); // Reusing the same state - we'll handle the distinction in the UI
      profileRef.current = profileWithType; // Persist in ref
      console.log("✅ Teacher profile set with borrowerType:", profileWithType);
      
      // Don't auto-enable borrow mode - let user choose between borrow/return
      console.log("✅ Teacher profile loaded - waiting for user to choose action");
    } catch (err) {
      console.error("Error fetching teacher profile:", err.response?.data || err);
      console.log("Full error:", err);
      setStudentProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const confirmBorrow = async () => {
    console.log("🚀 CONFIRM BORROW CALLED!");
    console.log("📊 Current state:", {
      hasStudentProfile: !!studentProfile,
      hasStudentId: !!studentProfile?.student?._id,
      hasBookQR: !!bookQR,
      studentId: studentProfile?.student?._id,
      bookQR: bookQR
    });
    
    // Debug the bookQR value in detail
    console.log("🔍 BOOK QR DEBUG:");
    console.log("  Raw value:", JSON.stringify(bookQR));
    console.log("  Type:", typeof bookQR);
    console.log("  Length:", bookQR?.length);
    console.log("  Char codes:", bookQR ? Array.from(bookQR).map(c => c.charCodeAt(0)) : 'N/A');
    console.log("  Trimmed:", JSON.stringify(bookQR?.trim()));
    console.log("  Trimmed length:", bookQR?.trim()?.length);
    
    // Support both students and teachers
    const borrowerId = studentProfile?.student?._id || studentProfile?.teacher?._id;
    const borrowerName = studentProfile?.student?.fullName || studentProfile?.teacher?.fullName;
    const borrowerType = studentProfile?.borrowerType || (studentProfile?.teacher ? "teacher" : "student");
    
    if (!borrowerId || !bookQR) {
      console.error("❌ Missing borrower ID or book QR for borrowing:", {
        hasBorrowerId: !!borrowerId,
        hasBookQR: !!bookQR,
        borrowerId: borrowerId,
        borrowerType: borrowerType,
        bookQR: bookQR
      });
      alert("Missing borrower information or book QR code. Please try again.");
      return;
    }
    
    console.log("🔄 Starting borrow process for:", {
      borrowerId: borrowerId,
      borrowerName: borrowerName,
      borrowerType: borrowerType,
      bookId: bookQR
    });
    
    try {
      console.log("📡 Calling borrowBookByQR API...");
      console.log("📋 API Parameters:", {
        borrowerId: borrowerId,
        borrowerType: borrowerType,
        bookId: bookQR,
        action: "borrow"
      });
      
      const result = await borrowBookByQR(borrowerId, bookQR, borrowerType);
      console.log("✅ Borrow API successful:", result);
      
      // Show success message
      alert(`✅ Book borrowed successfully!`);
      
      // Refresh the borrower profile to show the newly borrowed book
      console.log("🔄 Refreshing borrower profile...");
      if (borrowerType === "teacher") {
        await fetchTeacherProfile(borrowerId);
      } else if (studentProfile?.student?._id) {
        await fetchProfile(studentProfile.student._id);
      } else if (studentProfile?.student?.studentNumber) {
        await fetchProfileByNumber(studentProfile.student.studentNumber);
      }
      console.log("✅ Profile refreshed");
      
    } catch (err) {
      const errorData = err.response?.data;
      const errorMessage = errorData?.message || err.message || "Unknown error occurred";
      const statusCode = err.response?.status;
      
      console.error("❌ Error during borrow operation:", {
        status: statusCode,
        message: errorMessage,
        fullError: err
      });
      
      // Handle different error types gracefully
      if (statusCode === 401) {
        console.error("❌ Authentication error - token might be expired");
        alert("⚠️ Your session has expired. Please log in again.");
        // The interceptor will handle the redirect
        return;
      } else if (errorData?.type === "duplicate_borrow") {
        // Simple warning for duplicate borrow - no console error spam
        console.log("ℹ️ Book already borrowed by student");
        alert(`📖 You already have "${errorData.bookName}" borrowed.\n\nPlease return it first before borrowing again.`);
        
        // Reset to student profile view
        setBorrowMode(false);
        setBookQR("");
      } else if (errorData?.type === "cross_category_borrowed") {
        // Cross-category borrowing prevention
        console.log("⚠️ Cross-category borrow blocked:", errorData);
        alert(`⚠️ CROSS-CATEGORY BORROWING BLOCKED\n\n` +
              `Book: "${errorData.bookName}"\n\n` +
              `This book is already borrowed from: ${errorData.borrowedFrom}\n` +
              `You tried to borrow from: ${errorData.currentCategory}\n\n` +
              `The same physical book exists in multiple categories (Master List, Book Holdings, etc.) and can only be borrowed once at a time.\n\n` +
              `Please wait for it to be returned or select a different book.`);
        
        // Reset to borrower profile view
        setBorrowMode(false);
        setBookQR("");
      } else if (errorData?.type === "out_of_stock") {
        // All copies are currently borrowed
        console.log("ℹ️ All copies borrowed - out of stock");
        alert(`📚 All copies of "${errorData.bookName}" are currently borrowed.\n\nPlease select a different book or wait for someone to return it.`);
        
        // Reset to student profile view
        setBorrowMode(false);
        setBookQR("");
      } else if (errorData?.message?.includes("no available copy")) {
        console.log("ℹ️ No copies available");
        alert(`📚 ${errorMessage}\n\nBook: ${errorData.bookName || 'Unknown'}\nTotal Copies: ${errorData.totalCopies || 0}\nAvailable: ${errorData.availableCopies || 0}`);
        
        // Reset to student profile view
        setBorrowMode(false);
        setBookQR("");
      } else {
        // Only log actual errors to console
        console.error("❌ Unexpected error borrowing book:", errorMessage);
        alert(`❌ Error borrowing book: ${errorMessage}`);
      }
    } finally {
      console.log("🧹 Finally block reached - Resetting borrow mode...");
      resetModes();
    }
  };

  const confirmReturn = async () => {
    // Support both students and teachers
    const borrowerId = studentProfile?.student?._id || studentProfile?.teacher?._id;
    const borrowerType = studentProfile?.borrowerType || (studentProfile?.teacher ? "teacher" : "student");
    
    if (!borrowerId || !returnBookQR) {
      console.error("Missing borrower ID or book QR for return");
      return;
    }
    
    console.log("Confirming return for:", {
      borrowerId: borrowerId,
      borrowerType: borrowerType,
      bookQR: returnBookQR
    });
    
    // Find the borrow record that matches this book
    let borrowRecord = null;
    let scannedBookId = returnBookQR;
    
    // Try to parse as JSON first (new clean scanner format)
    try {
      const bookData = JSON.parse(returnBookQR);
      if (bookData.type === "book") {
        scannedBookId = bookData.bookId;
        console.log("📖 Parsed book data from QR:", bookData);
        console.log("📖 Using bookId for matching:", scannedBookId);
      } else if (bookData.type === "inventory") {
        scannedBookId = bookData.inventoryItemId;
        console.log("📖 Parsed inventory data from QR:", bookData);
        console.log("📖 Using inventoryItemId for matching:", scannedBookId);
      }
    } catch (e) {
      console.log("📖 Not JSON format, using direct matching");
    }
    
    // Find matching borrow record
    borrowRecord = studentProfile.borrowedBooks.find(b => {
      // Check legacy book model
      const bookId = b.book?._id;
      const bookPhysicalId = b.book?.physicalId;
      const bookNumber = b.book?.bookNumber;
      const bookIsbn = b.book?.isbn;
      
      // Check new inventory model
      const inventoryItemId = b.inventoryItemId || b.inventoryItem?._id || b.inventoryItem;
      
      console.log("Checking borrow record:", {
        borrowId: b._id,
        bookName: b.book?.name || b.inventoryItem?.title,
        bookId,
        inventoryItemId,
        scannedBookId
      });
      
      // Check for inventory item match (new format)
      if (inventoryItemId === scannedBookId) {
        console.log("✅ Found inventory item ObjectId match");
        return true;
      }
      
      // Check for legacy book ObjectId match
      if (bookId === scannedBookId) {
        console.log("✅ Found book ObjectId match");
        return true;
      }
      
      // Check other identifiers for legacy support
      return bookPhysicalId === scannedBookId || 
             bookNumber === scannedBookId || 
             bookIsbn === scannedBookId;
    });
    
    if (!borrowRecord) {
      console.log("Available borrowed books for matching:", 
        studentProfile.borrowedBooks.map(b => ({
          borrowId: b._id,
          bookName: b.book?.name || b.inventoryItem?.title,
          bookId: b.book?._id,
          inventoryItemId: b.inventoryItemId || b.inventoryItem?._id,
          physicalId: b.book?.physicalId,
          bookNumber: b.book?.bookNumber,
          isbn: b.book?.isbn
        }))
      );
      alert("⚠️ This book hasn't been borrowed yet.\n\nPlease scan a book that is currently borrowed to return it.");
      // Reset return mode to go back to profile view
      setReturnMode(false);
      returnModeRef.current = false;
      setReturnBookQR("");
      setTransactionInProgress(false);
      return;
    }
    
    console.log("Found matching borrow record:", {
      borrowId: borrowRecord._id,
      bookName: borrowRecord.book?.name || borrowRecord.inventoryItem?.title
    });
    
    try {
      // Call the return API with borrower ID and book QR data
      console.log("📡 Calling return API with:", {
        borrowerId: borrowerId,
        borrowerType: borrowerType,
        bookQR: returnBookQR,
        action: "return"
      });
      
      const apiData = {
        bookId: returnBookQR, 
        action: "return",
        borrowerType: borrowerType
      };
      
      if (borrowerType === "teacher") {
        apiData.teacherId = borrowerId;
      } else {
        apiData.studentId = borrowerId;
      }
      
      const result = await api.post("/borrow/scan/book", apiData);
      
      console.log("✅ Return successful:", result.data);
      // Get book title from the response's inventory item data or from the borrow record
      const bookTitle = result.data?.borrow?.inventoryItemData?.["Book Title"] || 
                       borrowRecord.book?.name || 
                       borrowRecord.inventoryItem?.["Book Title"] || 
                       borrowRecord.inventoryItem?.title || 
                       "Unknown Book";
      alert(`✅ Book "${bookTitle}" returned successfully!`);
      
      // Refresh the borrower profile to show the returned book
      if (borrowerType === "teacher") {
        await fetchTeacherProfile(borrowerId);
      } else if (studentProfile?.student?._id) {
        await fetchProfile(studentProfile.student._id);
      } else if (studentProfile?.student?.studentNumber) {
        await fetchProfileByNumber(studentProfile.student.studentNumber);
      }
    } catch (err) {
      console.error("❌ Error returning book:", err.response?.data || err);
      const errorMessage = err.response?.data?.message || err.message || "Unknown error";
      alert(`❌ Error returning book: ${errorMessage}`);
    } finally {
      resetModes();
    }
  };

  const resetModes = () => {
    console.log("🧹 RESET MODES CALLED - Clearing all borrow/return state");
    setBorrowMode(false);
    setReturnMode(false);
    borrowModeRef.current = false;
    returnModeRef.current = false;
    setBookQR("");
    setReturnBookQR("");
    setTransactionInProgress(false);
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto relative">
        <button 
          className="absolute top-2 right-2 text-2xl font-bold hover:text-red-500 bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center" 
          onClick={onClose}
        >
          ✕
        </button>

        {!studentProfile ? (
          <div className="text-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading student profile...</p>
            {console.log("🔄 Loading student profile:", { 
              hasQrData: !!qrData,
              qrDataLength: qrData?.length,
              loading: loading
            })}
          </div>
        ) : (
          <>
            {studentProfile.teacher ? (
              // Teacher profile display
              <>
                <h2 className="text-xl font-bold mb-2">{studentProfile.teacher.fullName}</h2>
                <p>Teaching Level: {studentProfile.teacher.teachingLevel}</p>
                <p>Advisory: {studentProfile.teacher.advisory || "N/A"}</p>
                <p className="text-sm text-blue-600 font-semibold">👨‍🏫 Teacher</p>
              </>
            ) : (
              // Student profile display
              <>
                <h2 className="text-xl font-bold mb-2">{studentProfile.student.fullName}</h2>
                <p>Year: {studentProfile.student.year}</p>
                <p>Adviser: {studentProfile.student.adviser}</p>
                <p className="text-sm text-green-600 font-semibold">👨‍🎓 Student</p>
              </>
            )}

            <div className="my-4">
              <h3 className="font-bold">Borrowed Books:</h3>
              {studentProfile.borrowedBooks.length === 0 ? (
                <p>No borrowed books</p>
              ) : (
                <ul>
                  {studentProfile.borrowedBooks.map((b) => (
                    <li key={b._id} className="flex justify-between items-center">
                      <span>
                        {b.inventoryItemData?.["Book Title"] || 
                         b.inventoryItemData?.title || 
                         b.inventoryItemData?.name || 
                         b.inventoryItemData?.booktitle || 
                         b.book?.name || 
                         b.book?.title || 
                         b.book?.["Book Title"] ||
                         "Unknown Book"} — Fine: ₱{b.fine}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="my-2">
              <h3>Total Fines: ₱{studentProfile.totalFine}</h3>
              {studentProfile.totalFine > 0 && (
                <button
                  onClick={() => {
                    const borrowerId = studentProfile.student?._id || studentProfile.teacher?._id;
                    const borrowerType = studentProfile.teacher ? "teacher" : "student";
                    
                    removeFine(borrowerId).then(() => {
                      if (borrowerType === "teacher") {
                        fetchTeacherProfile(borrowerId);
                      } else {
                        fetchProfile(borrowerId);
                      }
                    });
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded mt-2"
                >
                  Mark Fine as Paid
                </button>
              )}
            </div>

            {!borrowMode && !returnMode && (
              <div className="mt-6 pt-4 border-t-2 border-gray-300">
                <p className="text-center text-gray-700 font-semibold mb-3 text-lg">Choose an action:</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("🔵 BORROW BOOK BUTTON CLICKED");
                      console.log("🔵 Profile state:", {
                        hasProfile: !!studentProfile,
                        hasStudent: !!studentProfile?.student,
                        hasTeacher: !!studentProfile?.teacher,
                        borrowerType: studentProfile?.borrowerType
                      });
                      setBorrowMode(true);
                      borrowModeRef.current = true;
                      setTransactionInProgress(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg"
                  >
                    📚 Borrow Book
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("🔴 RETURN BOOK BUTTON CLICKED");
                      setReturnMode(true);
                      returnModeRef.current = true;
                      setTransactionInProgress(true);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg"
                  >
                    ↩️ Return Book
                  </button>
                </div>
              </div>
            )}

            {borrowMode && (
              <div className="mt-4">
                {console.log("🔍 BORROW MODE DEBUG:", { borrowMode, bookQR, bookQRLength: bookQR?.length })}
                {!bookQR ? (
                  <div className="text-center">
                    <p className="font-semibold text-blue-600 mb-4">📚 Scan Book QR Code</p>
                    <div className="bg-blue-50 p-6 rounded-lg border-2 border-dashed border-blue-300">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                        <p className="text-blue-700 font-medium mb-2">Waiting for QR scan...</p>
                        <p className="text-sm text-blue-600">
                          Please scan the book's QR code using your physical scanner
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetModes}
                      className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    {(() => {
                      // Check if book is already borrowed
                      let bookName = "Unknown Book";
                      let alreadyBorrowed = false;
                      
                      try {
                        const bookData = JSON.parse(bookQR);
                        // Handle both legacy book format and new inventory format
                        if (bookData.type === "book") {
                          bookName = bookData.name;
                          // Check if this book is in the borrowed books list
                          alreadyBorrowed = studentProfile.borrowedBooks.some(b => 
                            b.book?.name === bookData.name || 
                            b.book?._id === bookData.bookId
                          );
                        } else if (bookData.type === "inventory") {
                          bookName = bookData.title;
                          // Check if this inventory item is in the borrowed books list
                          alreadyBorrowed = studentProfile.borrowedBooks.some(b =>
                            b.inventoryItem?.title === bookData.title ||
                            b.inventoryItem?._id === bookData.inventoryItemId ||
                            b.inventoryItemId === bookData.inventoryItemId
                          );
                        }
                      } catch (e) {
                        // Handle legacy format
                      }
                      
                      if (alreadyBorrowed) {
                        return (
                          <div className="bg-yellow-50 p-4 rounded-lg mb-4 border-2 border-yellow-200">
                            <p className="text-lg text-yellow-700 font-semibold mb-2">
                              ⚠️ This Book is already borrowed, Please select another book
                            </p>
                            <div className="text-sm text-yellow-600">
                              <p><strong>Name:</strong> {bookName}</p>
                              <p className="mt-2">You already have this book. Please return it first before borrowing again.</p>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="bg-green-50 p-4 rounded-lg mb-4">
                          <p className="text-lg text-green-700 font-semibold mb-2">
                            ✅ Book QR code scanned successfully!
                          </p>
                          <div className="text-sm text-green-600">
                            {(() => {
                              try {
                                const bookData = JSON.parse(bookQR);
                                if (bookData.type === "book") {
                                  return (
                                    <div className="space-y-1">
                                      <p><strong>Name:</strong> {bookData.name}</p>
                                      <p><strong>Author:</strong> {bookData.author}</p>
                                    </div>
                                  );
                                } else if (bookData.type === "inventory") {
                                  return (
                                    <div className="space-y-1">
                                      <p><strong>Title:</strong> {bookData.title}</p>
                                      <p><strong>Author:</strong> {bookData.author}</p>
                                      <p><strong>Type:</strong> {bookData.inventoryType}</p>
                                    </div>
                                  );
                                }
                              } catch (e) {
                                // Fallback for legacy format
                              }
                              return <p>Book ID: {bookQR}</p>;
                            })()}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex gap-4 justify-center">
                      {(() => {
                        // Check if book is already borrowed to disable button
                        let alreadyBorrowed = false;
                        try {
                          const bookData = JSON.parse(bookQR);
                          if (bookData.type === "book") {
                            alreadyBorrowed = studentProfile.borrowedBooks.some(b => 
                              b.book?.name === bookData.name || 
                              b.book?._id === bookData.bookId
                            );
                          } else if (bookData.type === "inventory") {
                            alreadyBorrowed = studentProfile.borrowedBooks.some(b =>
                              b.inventoryItem?.title === bookData.title ||
                              b.inventoryItem?._id === bookData.inventoryItemId ||
                              b.inventoryItemId === bookData.inventoryItemId
                            );
                          }
                        } catch (e) {}
                        
                        return (
                          <button
                            onClick={alreadyBorrowed ? resetModes : confirmBorrow}
                            className={`px-6 py-2 rounded ${
                              alreadyBorrowed 
                                ? "bg-gray-400 text-gray-700 cursor-not-allowed" 
                                : "bg-green-500 text-white hover:bg-green-600"
                            }`}
                            disabled={alreadyBorrowed}
                          >
                            {alreadyBorrowed ? "Book Already Borrowed" : "Confirm Borrow"}
                          </button>
                        );
                      })()}
                      <button
                        onClick={resetModes}
                        className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {returnMode && (
              <div className="mt-4">
                {!returnBookQR ? (
                  <div className="text-center">
                    <p className="font-semibold text-red-600 mb-4">📖 Scan Book QR Code to Return</p>
                    <div className="bg-red-50 p-6 rounded-lg border-2 border-dashed border-red-300">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-3"></div>
                        <p className="text-red-700 font-medium mb-2">Waiting for QR scan...</p>
                        <p className="text-sm text-red-600">
                          Please scan the book's QR code to return it
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetModes}
                      className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="bg-green-50 p-4 rounded-lg mb-4">
                      <p className="text-lg text-green-700 font-semibold mb-2">
                        ✅ Book QR code scanned successfully!
                      </p>
                      <div className="text-sm text-green-600">
                        {(() => {
                          try {
                            const bookData = JSON.parse(returnBookQR);
                            if (bookData.type === "book") {
                              return (
                                <div className="space-y-1">
                                  <p><strong>Name:</strong> {bookData.name}</p>
                                  <p><strong>Author:</strong> {bookData.author}</p>
                                </div>
                              );
                            } else if (bookData.type === "inventory") {
                              return (
                                <div className="space-y-1">
                                  <p><strong>Title:</strong> {bookData.title}</p>
                                  <p><strong>Author:</strong> {bookData.author}</p>
                                  <p><strong>Type:</strong> {bookData.inventoryType}</p>
                                </div>
                              );
                            }
                          } catch (e) {
                            // Fallback for legacy format
                          }
                          return <p>Book/Item ID: {returnBookQR}</p>;
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={confirmReturn}
                        className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600"
                      >
                        Confirm Return
                      </button>
                      <button
                        onClick={resetModes}
                        className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QRPopup;

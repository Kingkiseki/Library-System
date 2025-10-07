import React, { useEffect, useState } from "react";
import api, {
  getStudentProfile,
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

  useEffect(() => {
    if (!qrData) return;
    console.log("QRPopup received data:", qrData);
    
    // Clean the QR data first (handle physical scanner corruption)
    let cleanedQRData = qrData;
    
    // Handle your specific scanner format: @@^@@?@@^@...@?@@^@...@?@@^@@
    console.log("Raw scanner input:", qrData);
    
    // Handle different scanner formats
    console.log("Trying to parse scanner format...");
    
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
  }, [qrData]);

  // Global book QR scanner listener when in borrow mode
  useEffect(() => {
    if (!borrowMode) return;

    let buffer = "";
    let scannerTimeout;

    const handleBookKeyDown = (e) => {
      // Clear timeout on any key press
      if (scannerTimeout) {
        clearTimeout(scannerTimeout);
      }

      if (e.key === "Enter") {
        if (buffer.trim() !== "" && buffer.length > 5) {
          const trimmedBuffer = buffer.trim();
          console.log("Book QR Scanner - Raw input:", trimmedBuffer);
          
          // Handle your specific scanner format for books: @@^@@?@@^@68349212827276793@?@@^@@?@@^@12345@?@@^@@
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
            setBookQR(bestBookId);
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

    document.addEventListener("keydown", handleBookKeyDown);
    return () => {
      document.removeEventListener("keydown", handleBookKeyDown);
      if (scannerTimeout) clearTimeout(scannerTimeout);
    };
  }, [borrowMode]);

  // Global book QR scanner listener when in return mode
  useEffect(() => {
    if (!returnMode) return;

    let buffer = "";
    let scannerTimeout;

    const handleReturnBookKeyDown = (e) => {
      // Clear timeout on any key press
      if (scannerTimeout) {
        clearTimeout(scannerTimeout);
      }

      if (e.key === "Enter") {
        if (buffer.trim() !== "" && buffer.length > 5) {
          const trimmedBuffer = buffer.trim();
          console.log("Return Book QR Scanner - Raw input:", trimmedBuffer);
          
          // Handle your specific scanner format for return books
          console.log("Return Book QR Scanner - Raw input:", trimmedBuffer);
          
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

    document.addEventListener("keydown", handleReturnBookKeyDown);
    return () => {
      document.removeEventListener("keydown", handleReturnBookKeyDown);
      if (scannerTimeout) clearTimeout(scannerTimeout);
    };
  }, [returnMode]);

  const fetchProfile = async (id) => {
    console.log("Fetching profile for student ID:", id);
    setLoading(true);
    try {
      const res = await getStudentProfile(id);
      console.log("Student profile response:", res.data);
      setStudentProfile(res.data);
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
        const res = await getStudentProfile(student._id);
        console.log("Student profile response:", res.data);
        setStudentProfile(res.data);
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
    
    if (!studentProfile?.student?._id || !bookQR) {
      console.error("❌ Missing student ID or book QR for borrowing:", {
        hasStudentId: !!studentProfile?.student?._id,
        hasBookQR: !!bookQR,
        studentId: studentProfile?.student?._id,
        bookQR: bookQR
      });
      alert("Missing student information or book QR code. Please try again.");
      return;
    }
    
    console.log("🔄 Starting borrow process for:", {
      studentId: studentProfile.student._id,
      studentName: studentProfile.student.fullName,
      bookId: bookQR
    });
    
    try {
      console.log("📡 Calling borrowBookByQR API...");
      console.log("📋 API Parameters:", {
        studentId: studentProfile.student._id,
        bookId: bookQR,
        action: "borrow"
      });
      
      const result = await borrowBookByQR(studentProfile.student._id, bookQR);
      console.log("✅ Borrow API successful:", result);
      
      // Show success message
      alert(`✅ Book borrowed successfully!`);
      
      // Refresh the student profile to show the newly borrowed book
      console.log("🔄 Refreshing student profile...");
      if (studentProfile.student._id) {
        await fetchProfile(studentProfile.student._id);
      } else if (studentProfile.student.studentNumber) {
        await fetchProfileByNumber(studentProfile.student.studentNumber);
      }
      console.log("✅ Profile refreshed");
      
    } catch (err) {
      console.error("❌ Error borrowing book:", {
        error: err,
        response: err.response?.data,
        status: err.response?.status,
        message: err.message
      });
      
      const errorMessage = err.response?.data?.message || err.message || "Unknown error occurred";
      alert(`❌ Error borrowing book: ${errorMessage}`);
    } finally {
      console.log("🧹 Finally block reached - Resetting borrow mode...");
      resetModes();
    }
  };

  const confirmReturn = async () => {
    if (!studentProfile?.student?._id || !returnBookQR) {
      console.error("Missing student ID or book QR for return");
      return;
    }
    
    console.log("Confirming return for:", {
      studentId: studentProfile.student._id,
      bookQR: returnBookQR
    });
    
    // Find the borrow record that matches this book by various possible identifiers
    const borrowRecord = studentProfile.borrowedBooks.find(b => {
      const bookId = b.book?._id;
      const bookPhysicalId = b.book?.physicalId;
      const bookNumber = b.book?.bookNumber;
      const bookIsbn = b.book?.isbn;
      
      console.log("Checking borrow record:", {
        borrowId: b._id,
        bookName: b.book?.name,
        bookId,
        bookPhysicalId,
        bookNumber,
        bookIsbn,
        scannedQR: returnBookQR
      });
      
      // Check exact matches first
      if (bookId === returnBookQR || 
          bookPhysicalId === returnBookQR ||
          bookNumber === returnBookQR ||
          bookIsbn === returnBookQR) {
        return true;
      }
      
      // Check if the scanned QR contains any of these IDs
      if ((bookId && returnBookQR.includes(bookId)) ||
          (bookPhysicalId && returnBookQR.includes(bookPhysicalId)) ||
          (bookNumber && returnBookQR.includes(bookNumber)) ||
          (bookIsbn && returnBookQR.includes(bookIsbn))) {
        return true;
      }
      
      return false;
    });
    
    if (!borrowRecord) {
      console.log("Available borrowed books for matching:", 
        studentProfile.borrowedBooks.map(b => ({
          borrowId: b._id,
          bookName: b.book?.name,
          bookId: b.book?._id,
          physicalId: b.book?.physicalId,
          bookNumber: b.book?.bookNumber,
          isbn: b.book?.isbn
        }))
      );
      alert(`This book (QR: ${returnBookQR}) is not currently borrowed by this student`);
      return;
    }
    
    console.log("Found matching borrow record:", {
      borrowId: borrowRecord._id,
      bookName: borrowRecord.book?.name
    });
    
    try {
      // Use the borrowRecord ID for the return API
      await returnBookByQR(borrowRecord._id);
      console.log("Return successful for borrow ID:", borrowRecord._id);
      
      // Refresh the student profile to show the returned book
      if (studentProfile.student._id) {
        await fetchProfile(studentProfile.student._id);
      } else if (studentProfile.student.studentNumber) {
        await fetchProfileByNumber(studentProfile.student.studentNumber);
      }
    } catch (err) {
      console.error("Error returning book:", err.response?.data || err);
      alert(`Error returning book: ${err.response?.data?.message || err.message}`);
    } finally {
      resetModes();
    }
  };

  const resetModes = () => {
    console.log("🧹 RESET MODES CALLED - Clearing all borrow/return state");
    setBorrowMode(false);
    setReturnMode(false);
    setBookQR("");
    setReturnBookQR("");
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-96 relative">
        <button className="absolute top-2 right-2" onClick={onClose}>
          ✕
        </button>

        {!studentProfile ? (
          <div>
            <div>Please register to borrow or return books</div>
            {console.log("🚨 NO STUDENT PROFILE:", { 
              hasStudentProfile: !!studentProfile, 
              studentProfile: studentProfile,
              borrowMode: borrowMode,
              bookQR: bookQR
            })}
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-2">{studentProfile.student.fullName}</h2>
            <p>Year: {studentProfile.student.year}</p>
            <p>Adviser: {studentProfile.student.adviser}</p>

            <div className="my-4">
              <h3 className="font-bold">Borrowed Books:</h3>
              {studentProfile.borrowedBooks.length === 0 ? (
                <p>No borrowed books</p>
              ) : (
                <ul>
                  {studentProfile.borrowedBooks.map((b) => (
                    <li key={b._id} className="flex justify-between items-center">
                      <span>
                        {b.book?.name || b.book?.title} — Fine: ₱{b.fine}
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
                  onClick={() =>
                    removeFine(studentProfile.student._id).then(() =>
                      fetchProfile(studentProfile.student._id)
                    )
                  }
                  className="bg-green-500 text-white px-4 py-2 rounded mt-2"
                >
                  Mark Fine as Paid
                </button>
              )}
            </div>

            {!borrowMode && !returnMode && (
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => setBorrowMode(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Borrow Book
                </button>
                <button
                  onClick={() => setReturnMode(true)}
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                  Return Book
                </button>
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
                    <div className="bg-green-50 p-4 rounded-lg mb-4">
                      <p className="text-lg text-green-700 font-semibold mb-2">
                        ✅ Book QR code scanned successfully!
                      </p>
                      <p className="text-sm text-green-600">
                        Book ID: {bookQR}
                      </p>
                    </div>
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={confirmBorrow}
                        className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
                      >
                        Confirm Borrow
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
                      <p className="text-sm text-green-600">
                        Book ID: {returnBookQR}
                      </p>
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

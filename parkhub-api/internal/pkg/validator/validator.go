package validator

import (
	"regexp"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

var (
	mobileRegex = regexp.MustCompile(`^1[3-9]\d{9}$`)
)

// MobileValidator validates Chinese mobile phone numbers.
func MobileValidator(fl validator.FieldLevel) bool {
	phone := fl.Field().String()
	return mobileRegex.MatchString(phone)
}

// RegisterMobileValidator registers the custom mobile validator.
func RegisterMobileValidator() {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		_ = v.RegisterValidation("mobile", MobileValidator)
	}
}
